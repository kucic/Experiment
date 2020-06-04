/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  SafeAreaView,
  StyleSheet, 
  View,
  Text,
  StatusBar,
  TouchableOpacity
} from 'react-native';

import ExampleApp from './cameratest'
 
const App: () => React$Node = () => {
  let camera = null;
  return (
    
      <View style={{flex:1}}> 
         <ExampleApp />
      </View> 
  
  );
  
};
 
 
export default App;
