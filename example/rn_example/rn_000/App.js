import React, { Component } from 'react';
import { StyleSheet, View, Platform, Image } from 'react-native';
 
import WebView from 'react-native-webview'
 
import renderHTML from './assets/html/index.html' 

//const test = Platform.OS === 'ios' ? require('./html/index.html') : {uri:'file:///android_asset/html/index.html"'} 
//const test = require('./assets/html/index.html');
export default class App extends Component {
    constructor(props) {
        super(props); 
        this.appWebview = null;


    }

    componentDidMount(){ 
    }
     
    onWebViewMessage = (event) => {
      console.warn('onWebViewMessage', JSON.parse(event.nativeEvent.data))
      let msgData;
        try {
            msgData = JSON.parse(event.nativeEvent.data) || {}
        } catch (error) {
            console.error(error)
            return
        }
        this[msgData.targetFunc].apply(this, [msgData]);
    }

    /**
     * 영화목록을 받아와서 화면에 전달한다.
     */
    getMovieList = msgData => {
        /*
      const option = {
          method: 'GET',
          timeout: 60000
      }
      */
      //file:///android_asset/html/index.html
      /*
      let url = 'file:///android_asset/html' + msgData.data.url
      console.warn('SEND : ', url)
      fetch(url, option)
          .then(res => {
              return res.json()
          })
          .then(response => {
              console.log('<====== response', response)
              msgData.isSuccessfull = true
              msgData.data = response
              this.appWebview.postMessage(JSON.stringify(msgData), '*');
          })
          .catch(error => {
              console.log(error)
          })
          */

        let datas = {
            "title": "The Basics - Networking",
            "description": "Your app fetched this from a remote endpoint!",
            "movies": [
              { "id": "1", "title": "Star Wars", "releaseYear": "1977" },
              { "id": "2", "title": "Back to the Future", "releaseYear": "1985" },
              { "id": "3", "title": "The Matrix", "releaseYear": "1999" },
              { "id": "4", "title": "Inception", "releaseYear": "2010" },
              { "id": "5", "title": "Interstellar", "releaseYear": "2014" }
            ]
          }
         console.warn('POST MESSAGE : ' , datas)
         this.appWebview.postMessage(JSON.stringify(datas), '*');
  }

    render() {

      

        if(Platform.OS === 'android'){
            return (
                <WebView
                  ref={r => this.appWebview = r}
                  style={{flex: 1}}
                  originWhitelist={['*']}
                  source={{uri:'file:///android_asset/html/index.html'}}
                  style={{ marginTop: 20 }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  onMessage={this.onWebViewMessage} 
                />
            )
          }else{
             
            return(
              <WebView
                ref={r => this.appWebview = r}
                style={{flex: 1}}
                originWhitelist={['*']} 
                source={renderHTML}
                style={{ marginTop: 20 }}
                javaScriptEnabled={true}
                domStorageEnabled={true} 
                onMessage={this.onWebViewMessage} 
              />
            );
          } 
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 30
    },
    webview: {
        flex: 1
    }
});
