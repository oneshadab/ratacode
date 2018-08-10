import React, { Component } from 'react';
import './App.css';
import './firebaseConfig';
import firebase from 'firebase/app';
import 'bootstrap/dist/css/bootstrap.min.css'
import TimeAgo from 'javascript-time-ago'
import {UnControlled as CodeMirror} from 'react-codemirror2'


// Load locale-specific relative date/time formatting rules.
import en from 'javascript-time-ago/locale/en'
// Add locale-specific relative date/time formatting rules.
TimeAgo.locale(en)
 
require('codemirror/lib/codemirror.css');
require('codemirror/theme/material.css');
require('codemirror/theme/neat.css');
require('codemirror/theme/idea.css');
require('codemirror/theme/mdn-like.css');
require('codemirror/mode/javascript/javascript')
// Create relative date/time formatter.
const timeAgo = new TimeAgo('en-US')

var db = firebase.database();

class Panel extends Component{
  constructor(props){
    super(props);
  }

  render(){
    var saveText, title, canClick, className;
    if(this.props.stage == "new"){
      title = "New Snippet";
      saveText = "Create new"
      canClick = true;
    }
    if(this.props.stage == "loading"){
      title = "Snippet #" + this.props.id;
      saveText = "Loading...";
      canClick = false;
    }
    if(this.props.stage == "done"){
      title = "Snippet #" + this.props.id;
      
      saveText = "Save changes"
      canClick = this.props.changed;
    }
    var className = "btn btn-primary w-100";
    if(!canClick){
      className = "btn btn-secondary w-100";
    }
    return (
      <div className="row pt-3 pb-2">
        <div className='col-10'>
          <h4> {title} </h4>
        </div>
        <div className='col-2'>
          <button
            className={className}
            onClick={this.props.handleSave} 
            disabled={!canClick}>
            {saveText}
          </button>
        </div>
      </div>
    );
  }
}


class HistoryPanel extends Component{
  constructor(props){
    super(props);
  }

  render(){
    var listItems = this.props.history.map((x) =>{
      var className = "list-group-item list-group-item-action";
      if(x == this.props.id){
        className = "list-group-item list-group-item-action active"
      }
      return (
        <button key={x}
          onClick={() => this.props.setID(x)}
          className={className}>
          {x}
        </button> 
    )
    });
    return (
      <div className='historyPanel'>
        <div className="list-group text-center">
          {listItems}
        </div>
      </div>
    );
  }

}



class Editor extends Component{
  constructor(props){
    super(props);
  }

  refCodeMirrorCallback = (ref) => {
    var cm = ref.getCodeMirror();
    var width = 20, height = 30;
    cm.setSize(width, height);
  }

  render(){
    var canEdit = (this.props.stage != 'loading');

    var lineCount = 0;
    var lineNumbers = this.props.text.split('\n').map((line) => {
      lineCount++;
      return (
        <div className="list-group-item p-0"> 
          {lineCount} 
        </div>
      );
    });
    var text = this.props.text;

    return (
      <div className="editor">
        <div className="row">
          <div className="col-0">
            <div className="list-group">
            </div>
          </div>
          <div className="col-12 border p-0">
            <CodeMirror
              value={this.props.text}
              options={{
                mode: 'javascript',
                theme: 'neat',
                lineNumbers: true
              }}
              onChange={(editor, data, value) => {
                  this.props.handleEdit(value);
              }}
            / >
              
          </div>
        </div>
      </div>
    );
  }

}


class App extends Component {
  constructor(props){
    super(props);
    this.state = {
      id: "",
      stage: "new",
      text: "",
      changed: false,
      history: [],
    }
  }

  
  

  updateFromID = async () => {
    
    var idString = window.location.search;
    if(idString.length > 1){
      var id = idString.substring(1) | 0;
      this.setState({id: id, stage: "loading"});
      db.ref('snippets').child(id).once('value').then((snapshot) => {
        var entry = snapshot.val();
        this.setState({text: entry['text'], changed: false, stage: "done"});
      });

      async function getHistory(id, pid, key){
        if(id == pid) return [];
        var snapshot = await db.ref('graph').child(id).once('value');
        var entry = snapshot.val();
        return [id].concat(await getHistory(entry[key], id, key));
      }
      var snapshot = await db.ref('graph').child(id).once('value');
      var entry = snapshot.val();
      var toHistory = (await getHistory(entry['to'], id, 'to')).reverse();
      var fromHistory = await getHistory(entry['from'], id, 'from');
      this.setState({history: toHistory.concat([id]).concat(fromHistory)});
    }
  }

  setID = (id) => {
    window.history.replaceState("", "", "?" + id);
    this.updateFromID();
  }

  handleSave = async () => {
    this.setState({stage: "loading"});
    this.setState({history: []});
    var id = null;
    var pid = this.state.id;
    db.ref('counter').transaction((val) => {
      if(val == null) return 0;
      return val + 1;
    }, async (error, committed, snapshot) => {
      if(committed){
        id = snapshot.val();
        if(pid === "") pid = id;
        var snippet = await db.ref('snippets').child(id);
        await snippet.set({
          'text' : this.state.text,
        });
        await db.ref('graph').child(id).set({ // Set self
            'from' : pid,
            'to' : id,
            'created' : Date.now()
        });
        await db.ref('graph').child(pid).update({ // Update parent
            'to' : id
        })

        this.setID(id);
        this.setState({stage: "done"});
      }
      
    });;    
  }

  

  handleEdit = (data) => {
    this.setState({
      text: data, 
      changed: true
    });
  }

  

  componentWillMount = () => {
    this.updateFromID();
  }
  
  render() {
    return (
      <div className="container">
        <Panel
          id={this.state.id}
          text={this.state.text}
          stage={this.state.stage}
          changed={this.state.changed}  
          handleSave={this.handleSave}/>
        <div className="row">
          <div className="col-10">
            <Editor
              stage={this.state.stage}
              text={this.state.text} 
              handleEdit={this.handleEdit}/>
          </div>
          <div className="col-2">
            <HistoryPanel
              stage={this.state.stage}
              history={this.state.history}
              id={this.state.id}
              setID={this.setID}/>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
