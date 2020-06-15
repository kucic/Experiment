'use strict'

import React, { Component } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { RNCamera } from 'react-native-camera';

import BarcodeMask from './camera_mask'

import {MRZParser} from './mrzparser'
import NfcManager, {NfcTech ,Ndef, NfcEvents} from 'react-native-nfc-manager'
 
const relativeWidth = num => (viewWidth * num) / 100;
const relativeHeight = num => (viewHeight * num) / 100;
   
const {width:viewWidth, height:viewHeight} = Dimensions.get("window");
const maskWidth = relativeWidth(95);
const maskHeight = relativeHeight(35);
const maskRect = {
  x: (viewWidth - maskWidth) * 0.5,
  y: (viewHeight * 0.5) -  (maskHeight * 0.5),
  width:maskWidth,
  height:maskHeight,
};




const relativeAreaWidth = num => (maskWidth * num) / 100;
const relativeAreaHeight = num => (maskHeight * num) / 100;

const mrzArea = {
  x:maskRect.x,
  y:maskRect.y + maskHeight - relativeAreaHeight(22),
  width:relativeAreaWidth(100),
  height:relativeAreaHeight(22),
} 

export default class ExampleApp extends Component {
  constructor(props){
    super(props)
    this.state = {
      textBlocks : null,
      snapData: null,

      supported:true,
      enabled:false,
      isWriting:false,
      tag:{},
      parsed:null,
    }

    this.timeHandle = null;
    this.inputEnabled = true; 
  }

  componentDidMount(){
    this.inputTimming(); 

    NfcManager.isSupported()
    .then(supported => {
        this.setState({ supported });
        if (supported) {
            this._startNfc();
        }
    })
  }
 

  componentWillUnmount(){
    if(this.timeHandle){
      clearTimeout(this.timeHandle)
    }
    if (this._stateChangedSubscription) {
      this._stateChangedSubscription.remove();
    }
  }


  _requestNdefWrite = () => {
      let {isWriting} = this.state;
      if (isWriting) {
          return;
      }

      let bytes = Ndef.encodeMessage([
          Ndef.textRecord("hello, world"),
          Ndef.uriRecord("http://nodejs.org"),
      ]);

      this.setState({isWriting: true});
      NfcManager.requestNdefWrite(bytes)
          .then(() => console.log('write completed'))
          .catch(err => console.warn(err))
          .then(() => this.setState({isWriting: false}));
  }

  _cancelNdefWrite = () => {
      this.setState({isWriting: false});
      NfcManager.cancelNdefWrite()
          .then(() => console.log('write cancelled'))
          .catch(err => console.warn(err))
  }

  _startNfc() {
      NfcManager.start({
          onSessionClosedIOS: () => {
              console.log('ios session closed');
          }
      })
          .then(result => {
              console.log('start OK', result);
          })
          .catch(error => {
              console.warn('start fail', error);
              this.setState({supported: false});
          })

      if (Platform.OS === 'android') {
          NfcManager.getLaunchTagEvent()
              .then(tag => {
                  console.log('launch tag', tag);
                  if (tag) {
                      this.setState({ tag });
                  }
              })
              .catch(err => {
                  console.log(err);
              })
          NfcManager.isEnabled()
              .then(enabled => {
                  this.setState({ enabled });
              })
              .catch(err => {
                  console.log(err);
              })
          /*
          NfcManager.onStateChanged(
              event => {
                  if (event.state === 'on') {
                      this.setState({enabled: true});
                  } else if (event.state === 'off') {
                      this.setState({enabled: false});
                  } else if (event.state === 'turning_on') {
                      // do whatever you want
                  } else if (event.state === 'turning_off') {
                      // do whatever you want
                  }
              }
          )
              .then(sub => {
                  this._stateChangedSubscription = sub; 
                  // remember to call this._stateChangedSubscription.remove()
                  // when you don't want to listen to this anymore
              })
              .catch(err => {
                  console.warn(err);
              })
          */
      }
  }


  _onTagDiscovered = tag => {
    console.log('Tag Discovered', tag);
    this.setState({ tag });

    let parsed = null;
    if (tag.ndefMessage && tag.ndefMessage.length > 0) {
        // ndefMessage is actually an array of NdefRecords, 
        // and we can iterate through each NdefRecord, decode its payload 
        // according to its TNF & type
        const ndefRecords = tag.ndefMessage;

        function decodeNdefRecord(record) {
            if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
                return ['text', Ndef.text.decodePayload(record.payload)];
            } else if (Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
                return ['uri', Ndef.uri.decodePayload(record.payload)];
            }

            return ['unknown', '---']
        }

        parsed = ndefRecords.map(decodeNdefRecord);
    }

    this.setState({parsed});
}

  _startDetection = () => {
    NfcManager.registerTagEvent(this._onTagDiscovered)
        .then(result => {
            console.log('registerTagEvent OK', result)
        })
        .catch(error => {
            console.warn('registerTagEvent fail', error)
        })
  }

  _stopDetection = () => {
      NfcManager.unregisterTagEvent()
          .then(result => {
              console.log('unregisterTagEvent OK', result)
          })
          .catch(error => {
              console.warn('unregisterTagEvent fail', error)
          })
  }

  _clearMessages = () => {
      this.setState({tag: null, parsed: null});
  }


  inputTimming = () => {
    this.inputEnabled = false;
    this.timeHandle = setTimeout( () => {
      this.inputEnabled = true;
    }, 1000)
  }

  textRecognized(data) {
     
    if(!this.inputEnabled)
      return;

    console.log(data);

    this.parserMRZArea(data);
    

    this.setState({
      textBlocks : data
    })
  }

  parserMRZArea = (data) =>{
    let collect = [];
    if(data){
      data.textBlocks.map(cdata=>{
        this.checkDataArea(collect, cdata, mrzArea);
      })  
    }
    
    console.log('MRZ area : ', collect);
    if(collect.length == 2){
      // check - 가능성이 있다.
      let line1 = collect[0].value;
      line1 = line1.trim()
      if(line1 > 44){
        return false;
      }
      if(line1.length < 44 ){
        // 일단  < 로 채운다.
        let num = 44 - line1.length;
        for(let i=0;i<num; i++){
          line1 += '<';
        }
      }
      let line2 = collect[1].value;
      line2 = line2.trim();
      if(line2.length > 44){
        return false;
      }
      if(line2.length < 44){
        return false;
      } 

      let value = line1 + line2;
      console.log('MRZ CODE : ', value)
      try{
        let result = MRZParser(value);
        console.warn(result)
        
      }catch(error){
        console.warn('parser error ')
        return;
      }

      this.takePicture();

      return true;
      
    }
    return false;
  }

  renderComponents = (data) =>{
    const {
      bounds,
      components
    } = data;
    return (
      <View>

      </View>
    )
  }

  isIntersectBox = (b1, b2)=>{
    if(b1.x + b1.width >= b2.x  && 
      b1.x <= b2.x + b2.width && 
      b1.y + b1.height >= b2.y &&
      b1.y <= b2.y + b2.height){
        return true;
      }
      return false;
  }

  renderBound = (data, color) => {
    return (
      <View
        style={{
          position:'absolute',
          top:data.origin.y,
          left:data.origin.x,
          width:data.size.width,
          height:data.size.height,
          borderColor:color,
          borderWidth:1,
        }}
     /> 
    )
  }

  convertBound = (bound) => {
    return{
      x: bound.origin.x,
      y: bound.origin.y,
      width: bound.size.width,
      height: bound.size.height
    }
  }

  checkDataArea = (collection , data, area) => {
    if(!this.isIntersectBox(this.convertBound(data.bounds), area)){
      return;
    }

    if(data.type == 'block'){ 
      data.components.map(mdata=>{
        this.checkDataArea(collection, mdata, area);
      }) 
    }else{
      if(data.type == 'line'){
        // check area 
        collection.push(data)
      }
    }
  }


  renderTextBlock = (data) => {
    const {
      bounds,
      components,
    } = data;

    // check bound
    if(!this.isIntersectBox({x:bounds.origin.x, y:bounds.origin.y, width:bounds.size.width, height:bounds.size.height}, maskRect)){
      return null;
    }


    return (
      <View
        style={{
          position:'absolute',
          top:bounds.origin.y,
          left:bounds.origin.x,
          //right:bounds.origin.x + bounds.size.width,
          //bottom:bounds.origin.y + bounds.size.height,
          borderColor:'blue',
          borderWidth:1,
          width:bounds.size.width,
          height: bounds.size.height,
        }}
      >
       
        {
          /*
          <Text
            style={{
              position:'absolute',
              bottom:0,
              left:0,
              width:1000,
            }}
          >{`value : ${data.value}   type : ${data.type}`}</Text>
          */
        }
      </View>
    )
    /*
     {
          components.map(component=>{
            return this.renderComponents(component)
          })
        }
    */
  }
 
  renderTextblocks = () => {
    if(this.state.textBlocks){ 
        let data = this.state.textBlocks;
        return (
          <View
            style={{
              position:'absolute',
              flex:1,
              justifyContent: 'flex-end',
              alignItems: 'center',
              width:viewWidth,
              height:viewHeight,
            }}
          >
            {
              data.textBlocks && 
              data.textBlocks.map(item=>{
                return this.renderTextBlock(item)
              })
            }
            {
              <Text>{`target : ${data.target} type : ${data.type}`}</Text>
            }
            
          </View>
        ) 
    }else{
      return null;
    }
  }
 
  render() {
    let { supported, enabled, tag, isWriting, parsed } = this.state;
    return (
      <View style={styles.container}>
        {
          this.state.snapData == null ? 
 
            <RNCamera
              ref={ref => {
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
              onGoogleVisionBarcodesDetected={({ barcodes }) => {
                console.log(barcodes);
              }}
              onTextRecognized = {(textBlock)=>{ 
                this.textRecognized(textBlock)
              }}
              rectOfInterest={{x:0,y:0,width:100,height:100}}
              cameraViewDimensions={{width:100,height:100}}
            /> 
          
          :
          <Image 
            style={styles.preview}
            source={{uri:this.state.snapData.uri}}
          />
        }
        
        {
          this.renderTextblocks()
        }
        <View style={{ zIndex:100, flex: 0, flexDirection: 'row', justifyContent: 'center' }}>
          
          <TouchableOpacity onPress={this.takePicture.bind(this)} style={styles.capture}>
            <Text style={{ fontSize: 14 }}> SNAP </Text>

          </TouchableOpacity>
          <TouchableOpacity onPress={this._startDetection} style={styles.capture}>
            <Text style={{ fontSize: 14 }}> Start Tag Detection </Text>

          </TouchableOpacity>

          <TouchableOpacity onPress={this._stopDetection} style={styles.capture}>
            <Text style={{ fontSize: 14 }}> Stop Detection </Text> 
          </TouchableOpacity>
          <TouchableOpacity onPress={this._clearMessages} style={styles.capture}>
            <Text style={{ fontSize: 14 }}> clear Message </Text> 
          </TouchableOpacity>
        </View>

        {
            <View style={{padding: 10, marginTop: 20, backgroundColor: '#e0e0e0' , position:'absolute', top:0}}>
                <Text>(android) Write NDEF Test</Text>
                <TouchableOpacity 
                    style={{ marginTop: 20, borderWidth: 1, borderColor: 'blue', padding: 10 }} 
                    onPress={isWriting ? this._cancelNdefWrite : this._requestNdefWrite}>
                    <Text style={{color: 'blue'}}>{`(android) ${isWriting ? 'Cancel' : 'Write NDEF'}`}</Text>
                </TouchableOpacity>
            </View>
        }
        <Text style={{ position:'absolute', top:100, marginTop: 20 }}>{`Current tag JSON: ${JSON.stringify(tag)}`}</Text>
                    { parsed && <Text style={{ marginTop: 10, marginBottom: 20, fontSize: 18 }}>{`Parsed: ${JSON.stringify(parsed)}`}</Text>}
        
        <BarcodeMask width={maskWidth} height={maskHeight} />
        <View
          style={{
            position:'absolute',
            width:maskWidth,
            height:maskHeight,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >

        </View> 
        {
          //mrz
          this.renderBound({
            "size":{
               "height":relativeAreaHeight(22),
               "width":relativeAreaWidth(100)
            },
            "origin":{
               "y":maskRect.y + maskHeight - relativeAreaHeight(22),
               "x":maskRect.x
            }
         }, 'red') 
        }
        {
          // national
          this.renderBound({
            "size":{
               "height":60,
               "width":100,
            },
            "origin":{
               "y":430,
               "x":120
            }
         }, 'red')
        }
        <View style={{width:viewWidth, height:1, backgroundColor:'blue', position:'absolute', left:0, top:viewHeight*0.5}} />
      </View>
    );
  }
 

  takePicture = async () => {
    if(this.state.snapData){
      this.setState({
        snapData : null
      }) 
      return;
      
    }
    if (this.camera) {
      const options = { quality: 0.5, base64: true };
      const data = await this.camera.takePictureAsync(options);
      console.warn('SNAP : DATA  : ',data.uri);
      this.setState({
        snapData : data
      }) 
    }
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',  
    width:viewWidth,
    height:viewHeight, 
  },
  preview: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width:viewWidth,
    height:viewHeight, 
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
 