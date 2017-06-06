/**
 * Created by toru on 2017/06/03.
 */

var nodes = null;
var edges = null;
var network = null;
var LENGTH_MAIN = 350,
    LENGTH_SERVER = 150,
    LENGTH_SUB = 50,
    WIDTH_SCALE = 2,
    RED = '#C5000B',
    GRAY = 'gray';


var TOKEN = "4/UfoTvMV-Ob1oGC44rjJLy_soa1NcshUAfSdTuOS--mI";
var DOCID = "1cv67Ney2_OrwGB9d4GLGj3IQU4myGydMBUkE3YfmecQ";
var REQ_URL = "https://sheets.googleapis.com/v4/spreadsheets/1cv67Ney2_OrwGB9d4GLGj3IQU4myGydMBUkE3YfmecQ/values:batchGet?ranges=s!A1:G9"

// Called when the Visualization API is loaded.
var systems = [];
var systemNodes = [];
var tables = [];
var tableNodes = [];
var systemEdges = [];
var tableEdges = [];

function create_nodes(responseTxt) {
    var resjson = JSON.parse(responseTxt)
    var values = resjson.values;
    var labels = values[0];


    // NODEの作成
    // system名を格納
    var j=0;
    for(var i=1;i<values.length;i++) {
        var systemName = values[i][0];
        if (systems.indexOf(systemName) == -1) {
            systems.push(values[i][0])
            systemNodes.push({id: j, label: values[i][0], group: 'system'});
            j++;
        }
    }

    // table名を格納
    for(var i=2;i<labels.length;i++){
        tables.push(labels[i])
        tableNodes.push({id:i-2 + 100, label:labels[i], group:'table'});
    }

    // EDGEの作成
    // フロー1レコードづつ操作していく
    var tableEdgeSize = 100;
    var tableEdgeStrength = new Array(tableEdgeSize);
    for(var y = 0; y < tableEdgeSize; y++) {
        tableEdgeStrength[y] = new Array(tableEdgeSize);
        for(var x = 0; x < tableEdgeSize; x++) {
            tableEdgeStrength[y][x] = {strength:0,tableId:""};
        }
    }

    var systemEdgeSize = 100;
    var systemEdgeStrength = new Array(systemEdgeSize);
    for(var y = 0; y < systemEdgeSize; y++) {
        systemEdgeStrength[y] = new Array(systemEdgeSize);
        for(var x = 0; x < systemEdgeSize; x++) {
            systemEdgeStrength[y][x] = {strength:0,arrow:"",tableId:""};
        }
    }
    for(var i=1;i<values.length;i++){
        var flowRecord = values[i];
        var systemName = flowRecord[0];
        var systemStrength = systemEdgeStrength[systemIndexByLabel(systemName)];
        var moduleName = flowRecord[1];
        // system -> tableのEDGEを作成
        for(var j=2;j<flowRecord.length;j++) {
            var crud = flowRecord[j];
            var arrowType = "";
            if (crud === "") {
                // なにも入力されていない場合はSKIP
                continue;
            } else if (crud.indexOf("C") !== -1 || crud.indexOf("D") !== -1 || crud.indexOf("U") !== -1){
                arrowType = "to";
            }
            var tableNode = tableNodeByIndex(j);
            systemEdgeStrength[systemIndexByLabel(systemName)][j - 2].strength++;
            systemEdgeStrength[systemIndexByLabel(systemName)][j - 2].arrow = arrowType;
            systemEdgeStrength[systemIndexByLabel(systemName)][j - 2].tableId = tableNode.id;
        }

        // table <-> table間のEDGEを作成
        for(var j=2;j<flowRecord.length;j++){
            var fromTableNode = tableNodeByIndex(j);
            var crud = flowRecord[j];
            if (crud === "") {
                // なにも入力されていない場合はSKIP
                continue;
            }
            for(var k=j+1;k<flowRecord.length;k++){
                var toTableNode = tableNodeByIndex(k);
               if (crud === "") {
                // なにも入力されていない場合はSKIP
                continue;
                }
                // 関連度を+1
                tableEdgeStrength[j-2][k-2].strength++;
            }
        }
    }

    // system -> tableのEDGEを作成
    for(var i=0;i<systemEdgeSize;i++){
        var systemNode = systemNodeByIndex(i);
        if(systemNode == null){
            continue;
        }
        for(var j=0;j<systemEdgeSize;j++){
            var tableNode = tableNodes[j];
            if(tableNode == null){
                continue;
            }
            var systemEdge = systemEdgeStrength[i][j];
            if(systemEdge.strength == 0){
                continue;
            }
           systemEdges.push({from: systemNode.id, to: tableNode.id,
            length: LENGTH_MAIN, width: systemEdge.strength, arrows:systemEdge.arrow});
        }
    }
    // system -> tableのEDGEを作成
    for(var i=0;i<tableEdgeSize;i++){
        var fromTableNode = tableNodes[i];
        if(fromTableNode == null){
            continue;
        }
        for(var j=0;j<tableEdgeSize;j++){
            var toTableNode = tableNodes[j];
            if(toTableNode == null){
                continue;
            }
            var tableEdge = tableEdgeStrength[i][j];
            if(tableEdge.strength == 0){
                continue;
            }
           tableEdges.push({from: fromTableNode.id, to: toTableNode.id,
            length: LENGTH_MAIN, width: tableEdge.strength, arrows:tableEdge.arrow});
        }
    }

    nodes = nodes.concat(systemNodes);
    nodes = nodes.concat(tableNodes);
    edges = edges.concat(systemEdges);
    edges = edges.concat(tableEdges);


    var container = document.getElementById('mynetwork');
    var data = {
        nodes: nodes,
        edges: edges
    };
    var options = {
        nodes: {
            scaling: {
                min: 16,
                max: 32
            }
        },
        edges: {
            color: GRAY,
            smooth: false
        },
        physics:{
            barnesHut:{gravitationalConstant:-30000},
            stabilization: {iterations:2500}
        },
        groups: {
            'switch': {
                shape: 'triangle',
                color: '#FF9900' // orange
            },
            desktop: {
                shape: 'dot',
                color: "#2B7CE9" // blue
            },
            mobile: {
                shape: 'dot',
                color: "#5A1E5C" // purple
            },
            server: {
                shape: 'square',
                color: "#C5000B" // red
            },
            internet: {
                shape: 'square',
                color: "#109618" // green
            }
        }
    };
    network = new vis.Network(container, data, options);
}

function tableNodeByIndex(index){
    return tableNodes[index-2];
}

function systemNodeByIndex(index){
    return systemNodes[index];
}

function systemIndexByLabel(label){
    for(var i=0;i<systemNodes.length;i++){
       if(systemNodes[i].label === label){
           return i;
       }
    }
    return null;
}

function load_json(filepath){
    var client = new XMLHttpRequest();
    client.open('GET', filepath);
    client.onreadystatechange = function() {
        switch ( client.readyState ) {
            case 0:
                // 未初期化状態.
                console.log('uninitialized!');
                break;
            case 1: // データ送信中.
                console.log('loading...');
                break;
            case 2: // 応答待ち.
                console.log('loaded.');
                break;
            case 3: // データ受信中.
                console.log('interactive... ' + client.responseText.length + ' bytes.');
                break;
            case 4: // データ受信完了.
                if (client.status == 200 || client.status == 304) {
                    nodes = create_nodes(client.responseText);
                    console.log('COMPLETE! :');
                } else {
                    console.log('Failed. HttpStatus: ' + client.statusText);
                }
                break;
        }
    }
    client.send();
}

function draw() {

    // Create a data table with nodes.
    nodes = [];
    // Create a data table with links.
    edges = [];
    load_json('./data.json')


    // nodes.push({id: 1, label: '192.168.0.1', group: 'switch', value: 10});
    // nodes.push({id: 2, label: '192.168.0.2', group: 'switch', value: 8});
    // nodes.push({id: 3, label: '192.168.0.3', group: 'switch', value: 6});
    // edges.push({from: 1, to: 2, length: LENGTH_MAIN, width: WIDTH_SCALE * 6, label: '0.71 mbps', arrows:"to"});
    // edges.push({from: 1, to: 3, length: LENGTH_MAIN, width: WIDTH_SCALE * 4, label: '0.55 mbps'});
    // // group around 2
    // for (var i = 100; i <= 104; i++) {
    //     var value = 1;
    //     var width = WIDTH_SCALE * 2;
    //     var color = GRAY;
    //     var label = null;
    //     if (i === 103) {
    //         value = 5;
    //         width = 3;
    //     }
    //     if (i === 102) {
    //         color = RED;
    //         label = 'error';
    //     }
    //     nodes.push({id: i, label: '192.168.0.' + i, group: 'desktop', value: value});
    //     edges.push({from: 2, to: i, length: LENGTH_SUB, color: color, fontColor: color, width: width, label: label});
    // }
    // nodes.push({id: 201, label: '192.168.0.201', group: 'desktop', value: 1});
    // edges.push({from: 2, to: 201, length: LENGTH_SUB, color: GRAY, width: WIDTH_SCALE});
    // // group around 3
    // nodes.push({id: 202, label: '192.168.0.202', group: 'desktop', value: 4});
    // edges.push({from: 3, to: 202, length: LENGTH_SUB, color: GRAY, width: WIDTH_SCALE * 2});
    // for (var i = 230; i <= 231; i++ ) {
    //     nodes.push({id: i, label: '192.168.0.' + i, group: 'mobile', value: 2});
    //     edges.push({from: 3, to: i, length: LENGTH_SUB, color: GRAY, fontColor: GRAY, width: WIDTH_SCALE});
    // }
    // // group around 1
    // nodes.push({id: 10, label: '192.168.0.10', group: 'server', value: 10});
    // edges.push({from: 1, to: 10, length: LENGTH_SERVER, color: GRAY, width: WIDTH_SCALE * 6, label: '0.92 mbps'});
    // nodes.push({id: 11, label: '192.168.0.11', group: 'server', value: 7});
    // edges.push({from: 1, to: 11, length: LENGTH_SERVER, color: GRAY, width: WIDTH_SCALE * 3, label: '0.68 mbps'});
    // nodes.push({id: 12, label: '192.168.0.12', group: 'server', value: 3});
    // edges.push({from: 1, to: 12, length: LENGTH_SERVER, color: GRAY, width: WIDTH_SCALE, label: '0.3 mbps'});
    // nodes.push({id: 204, label: 'Internet', group: 'internet', value: 10});
    // edges.push({from: 1, to: 204, length: 200, width: WIDTH_SCALE * 3, label: '0.63 mbps'});
    // // legend
    // var mynetwork = document.getElementById('mynetwork');
    // var x = - mynetwork.clientWidth / 2 + 50;
    // var y = - mynetwork.clientHeight / 2 + 50;
    // var step = 70;
    // nodes.push({id: 1000, x: x, y: y, label: 'Internet', group: 'internet', value: 1, fixed: true, physics:false});
    // nodes.push({id: 1001, x: x, y: y + step, label: 'Switch', group: 'switch', value: 1, fixed: true,  physics:false});
    // nodes.push({id: 1002, x: x, y: y + 2 * step, label: 'Server', group: 'server', value: 1, fixed: true,  physics:false});
    // nodes.push({id: 1003, x: x, y: y + 3 * step, label: 'Computer', group: 'desktop', value: 1, fixed: true,  physics:false});
    // nodes.push({id: 1004, x: x, y: y + 4 * step, label: 'Smartphone', group: 'mobile', value: 1, fixed: true,  physics:false});
    // create a network
    var container = document.getElementById('mynetwork');
    var data = {
        nodes: nodes,
        edges: edges
    };
    var options = {
        nodes: {
            scaling: {
                min: 16,
                max: 32
            }
        },
        edges: {
            color: GRAY,
            smooth: false
        },
        physics:{
            barnesHut:{gravitationalConstant:-30000},
            stabilization: {iterations:2500}
        },
        groups: {
            'switch': {
                shape: 'triangle',
                color: '#FF9900' // orange
            },
            desktop: {
                shape: 'dot',
                color: "#2B7CE9" // blue
            },
            mobile: {
                shape: 'dot',
                color: "#5A1E5C" // purple
            },
            server: {
                shape: 'square',
                color: "#C5000B" // red
            },
            internet: {
                shape: 'square',
                color: "#109618" // green
            }
        }
    };
    network = new vis.Network(container, data, options);
}
