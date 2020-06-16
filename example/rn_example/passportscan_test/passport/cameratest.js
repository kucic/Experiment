/* eslint-disable prettier/prettier */
import React, {Component} from 'react';
import {
  Platform,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import BarcodeMask from './camera_mask';
import {MRZParser} from './mrzparser'; 

import PassportReader from 'react-native-passport-reader'

// 화면 사이즈
const {width: viewWidth, height: viewHeight} = Dimensions.get('window');

// 비율로 화면사이즈 정함
const relativeWidth = (num) => (viewWidth * num) / 100;
const relativeHeight = (num) => (viewHeight * num) / 100;

// 여권 크기 마스크 사이즈
const maskWidth = relativeWidth(95);
const maskHeight = relativeHeight(35);
const maskRect = {
  x: (viewWidth - maskWidth) * 0.5,
  y: viewHeight * 0.5 - maskHeight * 0.5,
  width: maskWidth,
  height: maskHeight,
};

// 마스크 사이즈에서 비율로 크기를 정함
const relativeAreaWidth = (num) => (maskWidth * num) / 100;
const relativeAreaHeight = (num) => (maskHeight * num) / 100;

// MRZ 코드 영영
const mrzArea = {
  x: maskRect.x,
  y: maskRect.y + maskHeight - relativeAreaHeight(22),
  width: relativeAreaWidth(100),
  height: relativeAreaHeight(22),
};

export default class ExampleApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      textBlocks: null,
      snapData: null, 
      nfcData:null
    };

    this.timeHandle = null;
    this.inputEnabled = true;
  }

  componentDidMount() {
    this.inputTimming(); 
  }

  componentWillUnmount() {
    if (this.timeHandle) {
      clearTimeout(this.timeHandle);
    } 
  }

  // RN Camera 사진을 찍음 - snapData가 있다면 다시 초기화
  takePicture = async () => {
    if (this.state.snapData) {
      this.setState({
        snapData: null,
      });
      return;
    }
    if (this.camera) {
      const options = {quality: 0.5, base64: true};
      const data = await this.camera.takePictureAsync(options);
      //console.warn('SNAP : DATA  : ', data.uri);
      this.setState({
        snapData: data,
      });
    }
  };
 

  inputTimming = () => {
    this.inputEnabled = false;
    this.timeHandle = setTimeout(() => {
      this.inputEnabled = true;
    }, 1000);
  };

  textRecognized(data) {
    if (!this.inputEnabled) {
      return;
    }

    //console.log(data);

    this.parserMRZArea(data);

    this.setState({
      textBlocks: data,
    });
  }

  parserMRZArea = (data) => {
    let collect = [];
    if (data) {
      data.textBlocks.map((cdata) => {
        this.checkDataArea(collect, cdata, mrzArea);
      });
    }

    //console.log('MRZ area : ', collect);
    if (collect.length === 2) {
      // check - 가능성이 있다.
      let line1 = collect[0].value;
      line1 = line1.trim();
      if (line1 > 44) {
        return false;
      }
      if (line1.length < 44) {
        // 일단  < 로 채운다.
        let num = 44 - line1.length;
        for (let i = 0; i < num; i++) {
          line1 += '<';
        }
      }
      let line2 = collect[1].value;
      line2 = line2.trim();
      if (line2.length > 44) {
        return false;
      }
      if (line2.length < 44) {
        return false;
      }

      let value = line1 + line2;
      console.log('MRZ CODE : ', value);
      try {
        let result = MRZParser(value);
        console.warn(result);

        let documentNumber = result.documentNumber;
        let dateOfBirth = result.dob.original;
        let dateOfExpiry = result.expiry.original;

        this.NfcScan(documentNumber, dateOfBirth, dateOfExpiry)
      } catch (error) {
        console.warn('parser error ');
        return;
      }

      this.takePicture();

      return true;
    }
    return false;
  };

  async NfcScan(documentNumber, dateOfBirth, dateOfExpiry){
    try{
      console.warn(dateOfExpiry)
      const nfcData = await PassportReader.scan({
        // yes, you need to know a bunch of data up front
        // this is data you can get from reading the MRZ zone of the passport
        documentNumber: documentNumber,
        dateOfBirth: dateOfBirth,
        dateOfExpiry: dateOfExpiry
      })
    
      const { base64, width, height } = nfcData.photo;
      console.warn(nfcData.photo)

      this.setState({
        nfcData : nfcData
      })
    }catch(error){
      console.log(error)
    }
  }

  isIntersectBox = (b1, b2) => {
    if (
      b1.x + b1.width >= b2.x &&
      b1.x <= b2.x + b2.width &&
      b1.y + b1.height >= b2.y &&
      b1.y <= b2.y + b2.height
    ) {
      return true;
    }
    return false;
  };

  renderBound = (data, color) => {
    return (
      <View
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          position: 'absolute',
          top: data.origin.y,
          left: data.origin.x,
          width: data.size.width,
          height: data.size.height,
          borderColor: color,
          borderWidth: 1,
        }}
      />
    );
  };

  convertBound = (bound) => {
    return {
      x: bound.origin.x,
      y: bound.origin.y,
      width: bound.size.width,
      height: bound.size.height,
    };
  };

  checkDataArea = (collection, data, area) => {
    if (!this.isIntersectBox(this.convertBound(data.bounds), area)) {
      return;
    }

    if (data.type === 'block') {
      data.components.map((mdata) => {
        this.checkDataArea(collection, mdata, area);
      });
    } else {
      if (data.type === 'line') {
        // check area
        collection.push(data);
      }
    }
  };

  renderTextBlock = (data) => {
    const {bounds} = data;

    // check bound
    if (
      !this.isIntersectBox(
        {
          x: bounds.origin.x,
          y: bounds.origin.y,
          width: bounds.size.width,
          height: bounds.size.height,
        },
        maskRect,
      )
    ) {
      return null;
    }

    return (
      <View
        key={JSON.stringify(bounds.origin)}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          position: 'absolute',
          top: bounds.origin.y,
          left: bounds.origin.x,
          //right:bounds.origin.x + bounds.size.width,
          //bottom:bounds.origin.y + bounds.size.height,
          borderColor: 'blue',
          borderWidth: 1,
          width: bounds.size.width,
          height: bounds.size.height,
        }}>
        {/*
          <Text
            style={{
              position:'absolute',
              bottom:0,
              left:0,
              width:1000,
            }}
          >{`value : ${data.value}   type : ${data.type}`}</Text>
          */}
      </View>
    );
    /*
     {
          components.map(component=>{
            return this.renderComponents(component)
          })
        }
    */
  };

  renderTextblocks = () => {
    if (this.state.textBlocks) {
      const data = this.state.textBlocks;
      return (
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            position: 'absolute',
            flex: 1,
            justifyContent: 'flex-end',
            alignItems: 'center',
            width: viewWidth,
            height: viewHeight,
          }}>
          {data.textBlocks &&
            data.textBlocks.map((item) => {
              return this.renderTextBlock(item);
            })}
          {<Text>{`target : ${data.target} type : ${data.type}`}</Text>}
        </View>
      );
    } else {
      return null;
    }
  };

  render() {
    let {tag, parsed} = this.state;
    
    return (
      <View style={styles.container}>
        {this.state.snapData == null ? (
          <RNCamera
            ref={(ref) => {
              this.camera = ref;
            }}
            style={styles.preview}
            type={RNCamera.Constants.Type.back}
            flashMode={RNCamera.Constants.FlashMode.off}
            androidCameraPermissionOptions={{
              title: 'Permission to use camera',
              message: 'We need your permission to use your camera',
              buttonPositive: 'Ok',
              buttonNegative: 'Cancel',
            }}
            androidRecordAudioPermissionOptions={{
              title: 'Permission to use audio recording',
              message: 'We need your permission to use your audio',
              buttonPositive: 'Ok',
              buttonNegative: 'Cancel',
            }}
            onGoogleVisionBarcodesDetected={({barcodes}) => {
              console.log(barcodes);
            }}
            onTextRecognized={(textBlock) => {
              this.textRecognized(textBlock);
            }}
            rectOfInterest={{x: 0, y: 0, width: 100, height: 100}}
            cameraViewDimensions={{width: 100, height: 100}}
          />
        ) : (
          <Image
            style={styles.preview}
            source={{uri: this.state.snapData.uri}}
          />
        )}

        {this.renderTextblocks()}
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            zIndex: 100,
            flex: 0,
            flexDirection: 'row',
            justifyContent: 'center',
            flexWrap:'wrap'
          }}>
          <TouchableOpacity
            onPress={this.takePicture.bind(this)}
            style={styles.capture}>
            <Text
              // eslint-disable-next-line react-native/no-inline-styles
              style={{fontSize: 14}}> SNAP </Text>
          </TouchableOpacity>
           
        </View>

        <Text
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            position: 'absolute',
            top: 100,
            marginTop: 20,
          }}>{`Current tag JSON: ${JSON.stringify(tag)}`}</Text>
        {parsed && (
          <Text
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              marginTop: 10,
              marginBottom: 20,
              fontSize: 18,
            }}>{`Parsed: ${JSON.stringify(parsed)}`}</Text>
        )}

        <BarcodeMask width={maskWidth} height={maskHeight} />
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            position: 'absolute',
            width: maskWidth,
            height: maskHeight,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        />
        {
          //mrz
          this.renderBound(
            {
              size: {
                height: relativeAreaHeight(22),
                width: relativeAreaWidth(100),
              },
              origin: {
                y: maskRect.y + maskHeight - relativeAreaHeight(22),
                x: maskRect.x,
              },
            },
            'red',
          )
        }
        {
          // national
          this.renderBound(
            {
              size: {
                height: 60,
                width: 100,
              },
              origin: {
                y: 430,
                x: 120,
              },
            },
            'red',
          )
        }
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            width: viewWidth,
            height: 1,
            backgroundColor: 'blue',
            position: 'absolute',
            left: 0,
            top: viewHeight * 0.5,
          }}
        />
        {
          this.state.nfcData &&
          <Image 
            style={{
              position:'absolute',
              width:100,
              height:100,
            }}
            source={{uri:this.state.nfcData.photo.base64}}
          />
        }
        
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'white',
    width: viewWidth,
    height: viewHeight,
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: viewWidth,
    height: viewHeight,
  },
  capture: {
    flex: 0,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 15,
    paddingHorizontal: 20,
    alignSelf: 'center',
    margin: 20,
  },
});
