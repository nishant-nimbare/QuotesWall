import React, { Component } from 'react';
import { View, Text, Image, Button, Alert, Platform, Dimensions, StyleSheet, TouchableOpacity, AsyncStorage, Switch, TextInput } from 'react-native';
import ImageMarker from 'react-native-image-marker';
import Marker from 'react-native-image-marker';
import Wallpaper from 'rnwallpaper';
import ImageEditor from "@react-native-community/image-editor";
import BackgroundJob from 'react-native-background-job';

const config = require('../config');
const cheerio = require('cheerio-without-node-native');
const theme = require('../theme');

const ASYNC_KEY = 'isBackground';

var {height, width} = Dimensions.get('screen');


class test extends Component {
  constructor(props) {
    super(props);

    
    this.state = {
      quote:'',
      photo:'',
      switchVal:false,
    };

    AsyncStorage.getItem(ASYNC_KEY)
    .then(isBackground=>{
      if(isBackground === 'true'){
        this.setState({
          switchVal:true
        });
      }
    })
    .catch(err=>console.log('asyn err ',err));
  
  }

  async fetchQuote(){

    fetch(config.randomQuote)
    .then((response) => response.json())
    .then((responseJson) => {
      console.log(responseJson);
      this.setState({
        quote:responseJson.content,
      });
    })
    .catch((error) => {
      console.log('fetchQuote err ',error);
      
    });
  
  }

  getRand(){
    return Math.floor(Math.random()*config.subreddits.length);
  }

  async getImage(){

    var rand = this.getRand();
    console.log('rand ',rand);
    
    var sub = config.subreddits[rand];

    fetch(sub)
    .then(response => {
      // console.log('---image----',response)
      return response.text()
    })
    .then(content => this.scrap(content))
    .catch(err=>console.log(JSON.stringify(err)));
  
    // fetch(config.randomImage,{
    //   method:'GET',
    //   headers:{
    //     'Accept-Version': 'v1',
    //     'Authorization': config.unsplashAccess,
    //   }

    // })
    // .then(response=>response.json())
    // .then(resJson=>{

    //   console.log('image ', resJson);
    //   this.setState({
    //     photo:resJson.urls.regular,
    //   });

    // })
    // .catch(error=>Alert.alert(error));
  }

  async scrap(content){

    // console.log('---content---',content);
    try {
      
      // var $ = cheerio.load(content);
  
      // var photoLink = $('img').attr('src');
      
      // console.log('photo link ',photoLink);
      
      

      var link = content.match(/https:\/\/preview.redd.it\/[a-zA-Z0-9_]+\.jpg\?[a-zA-Z0-9_=&;]+/g);
      var one = link[0].replace(/&amp;/g,'&');
      console.log('link ', one);
      
      this.setState({
        photo:one,
      });

    } catch (error) {
      console.log(JSON.stringify( error));
    }
  
  }

  async crop(){

    console.log('crop clicked');
    
    try {
      

   var url = await ImageEditor.cropImage(this.state.photo, {
      offset: {x: 0, y: 0},
      size: {width: width, height: height},
    });
    
    console.log("Cropped image uri", url);
     
    this.setState({
        photo : url,
      });
    
     
    await this.combine();  

    } catch (err) {
      
      console.log('err croping ',err);
    }
     
  }

  async combine(){

    console.log('combine clicked');

    var fs=40;

    if(this.state.quote.length > 30 && this.state.quote.length < 60){
      fs = 30;
    }else if(this.state.quote.length > 60){
      fs = 20;
    }

    try{
    var path = await Marker.markText({

        src: this.state.photo,
        text: this.state.quote,
        color: '#101010',
        fontName: 'Arial-BoldItalicMT',
        fontSize: fs,
        position: 'center', 
        scale: 1, 
        quality: 100,
        textBackgroundStyle:{
          paddingX:25,
          paddingY:25
        }

    });
    
    console.log('combined path ',path);
    
    this.setState({
      photo : Platform.OS === 'android' ? 'file://' + path : path
    });

    } catch(err){console.log("combined err  ",err);}

  }


  async setWall() {
      Wallpaper.setWallpaper(this.state.photo, (res) => {
      
        console.log("Response: ", JSON.stringify(res));

        if(res.status === "success" || res.message === "success"){
          Alert.alert('Wallpaper Set')
        }

      });
  }


  async toggleScheduled(){

    var isBackground = await AsyncStorage.getItem(ASYNC_KEY);

    if(isBackground === 'true'){

      //cancel schedule 
      BackgroundJob.cancel({jobKey: "QuotesWall"})
      .then(async () => {
         await AsyncStorage.setItem(ASYNC_KEY,'false') ;
         this.setState({
          switchVal:false,
         })
        console.log("Success Schedule Cancelled");
      })
      .catch(err => console.log(err));

    }else{

      //schedule job

    BackgroundJob.schedule({ jobKey: "QuotesWall",})
  
    .then(async () => {
      await AsyncStorage.setItem(ASYNC_KEY,'true');
      this.setState({
        switchVal:true,
      })
      console.log("Success Scheduled")
    })
    .catch(err => console.log('err ',err));
    
    }
  }
  
  componentDidMount(){
  //   BackgroundJob.schedule({ jobKey: "QuotesWall",})
  // .then(() => console.log("Success Scheduled"))
  // .catch(err => console.log('err ',err));
  
  }

  render() {
    // this.getImage();

    return (
      <View style={{flex:1,backgroundColor:theme.White}}>

        <View style={styles.schedule}>
          <Text style={{flex:3, color:theme.Brownish, fontWeight:'bold'}}>Schedule wallpaper change everyday</Text>
          <Switch style={{flex:1}} value={this.state.switchVal} onValueChange={this.toggleScheduled.bind(this)}/>
        </View>
        <View style={styles.quote}>
          <TextInput 
            value={this.state.quote}        
            onChangeText={ (t)=> this.setState({quote:t})}
            style={{color:theme.Brownish, fontWeight:'bold', fontStyle:'italic', borderColor:theme.Brownish,
            borderWidth: 2}}
            multiline={true}
          />         
        </View>
        <View style={styles.image}>
        <Image
          style={{
            width: width/2,
            height: height/2,
        }}
          source={{uri:this.state.photo}}
        />
        </View>

      <View style={styles.buttonContainer}>

        <TouchableOpacity onPress={this.fetchQuote.bind(this)} style={styles.button}>
          <View><Text style={{color:theme.White}}>get Quote</Text></View>
        </TouchableOpacity>

        <TouchableOpacity onPress={this.getImage.bind(this)} style={styles.button}>
          <View><Text style={{color:theme.White}}>get Img</Text></View>
        </TouchableOpacity>


        <TouchableOpacity onPress={this.crop.bind(this)} style={styles.button}>
          <View ><Text style={{color:theme.White}}>combine</Text></View>
        </TouchableOpacity>

        <TouchableOpacity onPress={this.setWall.bind(this)} style={styles.button}>
          <View ><Text style={{color:theme.White}}>Set Wall</Text></View>
        </TouchableOpacity>
         
         </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({

  button:{
    flex:1,
    margin:5,
    height: height/15,
    backgroundColor:theme.Brownish,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: theme.Grey,
    alignItems:'center',
    alignContent:'center',
    justifyContent:'center'
  },

  buttonContainer:{
    flex:3,
    height:height/10,
    flexDirection:'row',
    alignSelf:'stretch',
    alignItems: 'center',
    alignContent:'space-around'
  },

  quote:{
    flex:2,
    alignItems:'center',
    alignContent:'center',
    justifyContent:'center',
    textAlign:'center',
    },

  image:{
    flex:8,
    alignItems:'center',
    alignContent:'center',
    justifyContent:'center'
  },

  schedule:{
    flexDirection:"row",
    flex:1,
    padding:20,
    alignItems:'center',
    alignContent:'center',
    justifyContent:'center',
    textAlign:'center',
    
  }

});

export default test;
