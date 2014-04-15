$(document).ready(function(){

	$('.btn').button();
	$('input').tooltip();
	$('.btn').tooltip();
	document.getElementById("graph").addEventListener('contextmenu', function (event) {
		event.preventDefault();
	});

	var graph = new Graph(700,400);
	
	$("#start-simulation").click(function(){
		if($("#simul-input").is(':visible')){
			$("#simul-input").hide("fast");
		}else{
			$("#simul-input").show("slow");
		}
	});

	$("#resize-plus").click(function(){
		graph.scaleStage(0.1)
	});

	$("#resize-moin").click(function(){
		graph.scaleStage(-0.1);
	});

	$("#save").click(function(){
		graph.generateXML();
	});

	$("#load").click(function(){
		$("#load-xml").modal();
	});

	$("#load2").click(function(){
		$("#load-xml").modal('hide');
		var xml = $("#xml-content").val();
		graph.parseXML(xml,graph);
		console.log(graph);
	});

	$("#generate-matrix").click(function(){
		graph.generateMatrix();
		$("#tm-matrix").modal();
	});
	
	var simulator = null;
	$("#play").click(function(){
		if(simulator == null){
			if(graph.initialState != null){
				$("#rubbon").html("");
				var symbols = $("#symbols").val();
				for(i = 0 ; i < symbols.length ; i++){
					$("#rubbon").append("<li><span class='label label-info' style='font-size:16px'>"+symbols[i]+"</span></li>");
				}
				$("#rubbon>li:eq(0)>span").removeClass("label-info");
				$("#rubbon>li:eq(0)>span").addClass("label-danger");
				var time = $("#time").val();
				simulator = new Simulator(graph,symbols,parseInt(time));
				simulator.simulate(true);
			}else{
				$("#error .modal-title").html('Error');
				$("#error .modal-body").html('Please specify the initial state.Right click on the state and choose "Set as initial state" menu.');
				$('#error').modal();
			}
		}else{
			simulator.paused = false;
		}
	});

	$("#pause").click(function(){
		simulator.paused = true;
	});

	$("#reset").click(function(){
		graph.reset();
		if(simulator != null){
			simulator.paused = true;
			simulator.autom = false;
			simulator = null;
		}
		$("#rubbon").html("");
	});
});



//******************* Graph Class ******************************

var Graph = function(width,height){
	//Attributes
	var ref = this;
	this.cells = new Array();
	this.initialState = null;
	this.currentSelection = null;
	this.isConnecting =  false;

	this.stage = new Kinetic.Stage({
		container: 'graph',
		width: width,
		height: height,
		draggable:true
	});

	this.layer = new Kinetic.Layer();
	this.stage.add(this.layer);
	this.scale = 1;
	this.minScale = 0.5;
	this.maxScale = 2;


	this.background = new Kinetic.Rect({
		x: 0,
		y: 0,
		width: this.stage.getWidth(),
		height: this.stage.getHeight(),
		fill: 'white',
		corner : 8
	});

	this.background.on('click',function(){
		ref.removeSelection();
	});

	

	this.layer.add(this.background);
	this.background.setZIndex(0);

	//*********** UI LISTENERS 
	$("#submit-cell-props").click(function(){
		var name = $("#cell-name").val();
		if(ref.cellExist(name)){
			$("#error-name").html("State name already exist");
		}else{
			ref.currentSelection.stateName = name;
			ref.currentSelection.textInfo.text(name);
			ref.currentSelection.textInfo.draw();
			ref.layer.draw();
		}
		
	});

	$("#submit-edge-props").click(function(){
		ref.currentSelection.inputRead = $("#edge-read").val();
		ref.currentSelection.outputWrite = $("#edge-write").val();
		if($("#left").attr('checked') == 'checked'){
			ref.currentSelection.orientation = "Left"
		}else{
			ref.currentSelection.orientation = "Right"
		}
		ref.currentSelection.updateText();
		ref.currentSelection.textInfo.draw();
		ref.layer.draw();
	});

	$("#add-state").click(function(){
		ref.addCell(300,200,"s"+ref.cells.length);
	});

	$("#connectTo").click(function(){
		$("#state-menu").css("display","none");
		ref.isConnecting = true;
	});

	$("#initial").click(function(){
		ref.setIntnitialState();
	});

	$("#delete-edge").click(function(){
		inState = ref.currentSelection.inCell;
		outState = ref.currentSelection.outCell;
		index = inState.outEdges.indexOf(ref.currentSelection);
		inState.outEdges.splice(index,1);
		index = outState.inEdges.indexOf(ref.currentSelection);
		outState.outEdges.splice(index,1);
		$("#edge-props").css("display","none");
		$("#edge-menu").css("display","none");
		ref.currentSelection.remove();
		ref.layer.draw();
	});

	$("#delete-cell").click(function(){
		for(var i = 0; i < ref.currentSelection.outEdges.length ; i++){
			edge = ref.currentSelection.outEdges[i];
			index = edge.outCell.inEdges.indexOf(edge);
			edge.outCell.inEdges.splice(index,1);
			edge.remove();
		}

		for(var i = 0; i < ref.currentSelection.inEdges.length ; i++){
			edge = ref.currentSelection.inEdges[i];
			index = edge.outCell.outEdges.indexOf(edge);
			edge.outCell.outEdges.splice(index,1);
			edge.remove();
		}
		$("#cell-props").css("display","none");
		$("#state-menu").css("display","none");
		ref.currentSelection.remove();
		ref.layer.draw();
	});
	

	//******************* Methods
	this.addCell = function(x,y,name){
		var cell = new Cell(x,y,this,name);
		this.cells.push(cell);
		cell.draw();
		return cell;
	}

	this.getLayer = function(){
		return this.layer;
	}

	this.itemSelected = function(item){
		this.removeSelection();
		this.currentSelection = item;
		if(item instanceof Cell){
			var tween = new Kinetic.Tween({
				node : item.graphics,
		        strokeWidth: 1,
		        scaleX: 1.5,
		        scaleY: 1.5,
		        duration: 0.05
		    });
			tween.play();
		}else{
			var tween = new Kinetic.Tween({
				node : item.graphics,
		        strokeWidth: 7,
		        fillRed: 255,
		        fillGreen: 0,
		        fillBlue: 0,
		        duration: 0.05
		    });
			tween.play();
		}
		this.displayProperties(item);
	}

	this.removeSelection = function(){
		if(this.currentSelection != null){
			if(this.currentSelection instanceof Cell){
				var tween = new Kinetic.Tween({
					node : ref.currentSelection.graphics,
			        strokeWidth: 2,
			        scaleX: 1,
			        scaleY: 1,
			        duration: 0.05
			    });
			    tween.play();
			}else{
				if(this.currentSelection instanceof Edge){
					var tween = new Kinetic.Tween({
						node : ref.currentSelection.graphics,
				        strokeWidth: 2,
				        duration: 0.05
				    });
					tween.play();
				}
			}
		}
		$("#edge-props").css("display","none");
		$("#cell-props").css("display","none");
		$("#state-menu").css("display","none");
		$("#edge-menu").css("display","none");
	}


	this.displayProperties = function(item){
		if(item instanceof Cell){
			$("#error-name").html("");
			$("#edge-props").css("display","none");
			$("#cell-name").val(item.stateName);
			$("#cell-props").css("display","block");
		}else{
			if(item instanceof Edge){
				$("#cell-props").css("display","none");
				$("#edge-read").val(item.inputRead);
				$("#edge-write").val(item.outputWrite);
				if(item.orientation == "Left"){
					$("#left").prop("checked",true);
				}else{
					$("#right").prop("checked",true);
				}
				$("#edge-props").css("display","block");
			}
		}
	}

	this.showCellMenu = function(item,posX,posY){
		this.currentSelection = item;
		if(item instanceof Cell){
			$("#state-menu").css("display","block");
			$("#state-menu").css("top",""+posY);
			$("#state-menu").css("left",""+posX);
		}else{
			if(item instanceof Edge){
				$("#edge-menu").css("display","block");
				$("#edge-menu").css("top",""+posY);
				$("#edge-menu").css("left",""+posX);
			}
		}
	}

	this.setIntnitialState = function(){
		$("#state-menu").css("display","none");
		if(this.initialState != null){
			this.initialState.graphics.fill("blue");
			this.layer.draw();
		}
		this.initialState = this.currentSelection;
		this.initialState.graphics.fill("red");
		this.layer.draw();
	}

	this.scaleStage = function(val) {
	  	console.log(this.scale);
		this.scale += val;
		if(this.scale > this.maxScale){
			this.scale = this.maxScale;
		}
		if(this.scale < this.minScale){
			this.scale = this.minScale;
		}
		
		this.stage.setPosition(0,0);
		this.stage.scale({
			x:this.scale,
			y:this.scale
		});
		this.layer.draw();
		this.stage.draw();
	}

	this.generateMatrix = function(){
		var table = "<table class='table table-striped table-bordered'><thead><td>State</td><td>Read</td><td>Write</td><td>Goto</td><td>New State</td></thead><tbody>";
		for(var i=0;i < this.cells.length;i++){
			var state = this.cells[i];
			
			for(var j=0;j < state.outEdges.length;j++){
				var edge =  state.outEdges[j];
				if(state ==  this.initialState ){
					table += "<tr class='success'><td>"+state.stateName+"</td>";
				}else{
					table += "<tr><td>"+state.stateName+"</td>";
				}
				
				table += "<td>"+edge.inputRead+"</td><td>"+edge.outputWrite+"</td><td>"+edge.orientation+"</td><td>"+edge.outCell.stateName+"</td>";
			}
			table += "</tr>";
		}
		table += "</tbody></table>"
		$("#tm-matrix .modal-body").html(table);
	}

	this.generateXML = function(){
		var tempStates = this.cells;
		var states = "<states>";
		var edges = "<edges>";
		var j = 0;
		while( j < tempStates.length ){
			current = tempStates[j];
			console.log(current);
			var state = "<state name='"+current.stateName+"' ";
			if(this.initialState == current){
				state+="initial='true'/>"
			}else{
				state+="/>"
			}
			states += state;
			var edge;
			for(var i = 0; i < current.outEdges.length ; i++){
				edge = current.outEdges[i];
				console.log(edge);
				var edgeXML = "<edge><in>"+edge.inCell.stateName+"</in>";
				edgeXML += "<out>"+edge.outCell.stateName+"</out>";
				edgeXML += "<read>"+edge.inputRead.replace("&","&amp;")+"</read>";
				edgeXML += "<write>"+edge.outputWrite.replace("&","&amp;")+"</write>";
				edgeXML += "<goto>"+edge.orientation+"</goto>";
				edgeXML += "</edge>"
				edges += edgeXML;
				index = edge.outCell.inEdges.indexOf(edge);
			}
			j++;
		}
		states += "</states>";
		edges += "</edges>";
		var xml = "<turing_machine>"+states+edges+"</turing_machine>";
		console.log(xml);
		$("#xml textarea").val(xml);
		$("#xml").modal();
	}

	this.parseXML = function(xml){
		this.reset();
		var incX = 120;
		var incY = 50;
		var xml = $.parseXML(xml);
		var posX = incX;
		var posY = incY;
		$(xml).find("state").each(function(){
			var name = $(this).attr("name");
			var initial = $(this).attr("initial");
			var cell = ref.addCell(posX,posY,name);
			if(initial == "true"){
				ref.initialState = cell;
				ref.initialState.graphics.fill("red");
				ref.layer.draw();
			}
			posX += incX;
			if(posX >= 400){
				posX = incX;
				posY += incY;
			}
		});

		$(xml).find("edge").each(function(){
			var outState = ref.getCellByName($($(this).find("in")).text());
			var inState = ref.getCellByName($($(this).find("out")).text());
			var read = $($(this).find("read")).text();
			var write = $($(this).find("write")).text();
			var orientation = $($(this).find("goto")).text();
			inState.connectTo(outState,read,write,orientation);
		});
	}

	this.reset = function(){
		this.layer.removeChildren();
		this.layer.draw();
		this.cells = new Array();
		this.initialState = null;
		this.currentSelection = null;
	}

	this.getCellByName = function(name){
		for(var i =0; i<this.cells.length ;i++){
			if(this.cells[i].stateName == name ){
				return this.cells[i];
				break;
			}
		}
		return null;
	}

	this.cellExist = function(name){
		for(var i=0; i<this.cells.length; i++){
			if(this.cells[i].stateName == name){
				return true;
			}
		}
		return false;
	}
}


//******************* Cell Class ******************************

var Cell = function(posX,posY,g,name){
	//Attributes
	var ref = this;
	this.stateName = name;
	this.inEdges = new Array();
	this.outEdges = new Array();
	this.graph = g;
	this.anim = null;

	this.graphics = new Kinetic.Circle({
						draggable: true,
						x: posX,
						y: posY,
						radius: 24,
						fill: 'blue',
					});

	this.graphics.on('mouseover', function() {
        document.body.style.cursor = 'pointer';
        this.stroke("black");
        ref.graph.getLayer().draw();
     
   	});

    this.graphics.on('mouseout', function() {
      document.body.style.cursor = 'default';
      this.stroke("");
      ref.graph.getLayer().draw();
    });

    this.graphics.on('dragmove', function() {
    	for(i = 0 ; i < ref.inEdges.length ; i++){
    		ref.inEdges[i].updatePosition();
    	}

    	for(i = 0 ; i < ref.outEdges.length ; i++){
    		ref.outEdges[i].updatePosition();
    	}

    	ref.textInfo.position({
			x : ref.graphics.getPosition().x-8,
			y : ref.graphics.getPosition().y-5,
		});
	});

	this.graphics.on('click', function(e){
		if(e.evt.which == 1){
			if(ref.graph.isConnecting){
				ref.graph.currentSelection.connectTo(ref,"&","&","Left");
				ref.graph.isConnecting = false;
			}else{
				ref.graph.itemSelected(ref);
			}
			
		}else{
			if(e.evt.which == 3){
				ref.graph.itemSelected(ref);
				ref.graph.showCellMenu(ref,e.evt.clientX,e.evt.clientY);
			}
		}
	});

	this.textInfo = new Kinetic.Text({
		x: posX-8,
		y: posY-5,
		text: ref.stateName,
		fontSize: 12,
		fontFamily: 'Calibri',
		fill: 'white',
		draggable:true
	});

	this.textInfo.on('dragmove', function() {
		console.log("ok");
    	for(i = 0 ; i < ref.inEdges.length ; i++){
    		ref.inEdges[i].updatePosition();
    	}

    	for(i = 0 ; i < ref.outEdges.length ; i++){
    		ref.outEdges[i].updatePosition();
    	}

    	ref.graphics.position({
			x : ref.textInfo.getPosition().x+8,
			y : ref.textInfo.getPosition().y+5,
		});
	});

	this.textInfo.on('click', function(e){
		if(e.evt.which == 1){
			if(ref.graph.isConnecting){
				ref.graph.currentSelection.connectTo(ref,"&","&","Left");
				ref.graph.isConnecting = false;
			}else{
				ref.graph.itemSelected(ref);
			}
			
		}else{
			if(e.evt.which == 3){
				ref.graph.itemSelected(ref);
				ref.graph.showCellMenu(ref,e.evt.clientX,e.evt.clientY);
			}
		}
	});

	this.textInfo.on('mouseover', function() {
        document.body.style.cursor = 'pointer';
        ref.graphics.stroke("black");
        ref.graph.getLayer().draw();
     
   	});

    this.textInfo.on('mouseout', function() {
      document.body.style.cursor = 'default';
      ref.graphics.stroke("");
      ref.graph.getLayer().draw();
    });

	//Methods
	this.draw = function(){
		this.graph.getLayer().add(this.graphics);
		this.graph.getLayer().add(this.textInfo);
		this.graph.getLayer().draw();
	}

	this.connectTo = function(cell,read,write,orientation){
		var edge = new Edge(this,cell,this.graph,read,write,orientation);
		this.outEdges.push(edge);
		cell.inEdges.push(edge);
		edge.draw();
	}

	this.addInEdge = function(edge){
		this.idEdges.push(edge);
	}

	this.addOutEdge = function(edge){
		this.outEdges.push(edge);
	}

	this.startAnimation = function(){
		ref.graphics.fill("pink");
		var tween = new Kinetic.Tween({
		node : ref.graphics,
		      scaleX: 1.5,
		      scaleY: 1.5,
		      duration: 0.05
		});
		tween.play();
	}

	this.stopAnimation = function(){
		ref.graphics.fill("blue");
		var tween = new Kinetic.Tween({
		node : ref.graphics,
		      scaleX: 1,
		      scaleY: 1,
		      duration: 0.05
		});
		tween.play();
	}

	this.remove = function(){
		var index = this.graph.cells.indexOf(this);
		this.graph.cells.splice(index,1);
		this.graphics.remove();
		this.textInfo.remove();
	}
}


//******************* Edge Class ******************************

var Edge = function(inCell,outCell,g,read,write,orientation){
	//Attributes
	var ref = this;
	this.inputRead = read;
	this.outputWrite = write;
	this.orientation = orientation;
	this.inCell = inCell;
	this.outCell = outCell;
	this.graph = g;
	this.arrowAngle = Math.PI/4;
	this.arrowLen = 10;

	this.anchor = new Kinetic.Circle({
                x: (ref.inCell.graphics.getPosition().x+ref.outCell.graphics.getPosition().x)/2,
                y: (ref.inCell.graphics.getPosition().y+ref.outCell.graphics.getPosition().y)/2,
                radius: 4,
                stroke: '#666',
                fill: '#ddd',
                strokeWidth: 2,
                draggable: true
            });

	this.anchor2 = new Kinetic.Circle({
                x: (ref.anchor.getPosition().x+ref.outCell.graphics.getPosition().x)/2,
                y: (ref.anchor.getPosition().y+ref.outCell.graphics.getPosition().y)/2,
                radius: 4,
                stroke: '#666',
                fill: '#ddd',
                strokeWidth: 2,
                draggable: true
            });

	this.anchor.on('dragmove',function(){
		ref.updatePosition2();
	});

	this.anchor2.on('dragmove',function(){
		ref.updatePosition2();
	});

	this.anchor.on('mouseover', function() {
        document.body.style.cursor = 'pointer';
        this.stroke("red");
        this.strokeWidth(2);
        ref.graph.getLayer().draw();
   	});

   	this.anchor2.on('mouseover', function() {
        document.body.style.cursor = 'pointer';
        this.stroke("red");
        this.strokeWidth(2);
        ref.graph.getLayer().draw();
   	});

   	this.anchor.on('mouseout', function() {
   		document.body.style.cursor = 'default';
        this.stroke("#666");
        this.strokeWidth(2);
        ref.graph.getLayer().draw();
   	});

   	this.anchor2.on('mouseout', function() {
   		document.body.style.cursor = 'default';
        this.stroke("#666");
        this.strokeWidth(2);
        ref.graph.getLayer().draw();
   	});


	if(inCell == outCell){
	    this.anchor.position({
			x : ref.outCell.graphics.getPosition().x+10,
			y : ref.outCell.graphics.getPosition().y+80
		});

		this.anchor2.position({
			x : ref.anchor.getPosition().x-10,
			y : ref.anchor.getPosition().y+80
		});
	}

	var x1 = this.inCell.graphics.getPosition().x;
	var y1 = this.inCell.graphics.getPosition().y;
	var x2 = this.outCell.graphics.getPosition().x;
	var y2 = this.outCell.graphics.getPosition().y;
	var anx1 = this.anchor.getPosition().x;
	var any1 = this.anchor.getPosition().y;
	var anx2 = this.anchor2.getPosition().x;
	var any2 = this.anchor2.getPosition().y;

	var arrowx = Math.abs(x1+(x2-x1)/3);
	var arrowy = Math.abs(y1+(y2-y1)/3);
	var tempAngle = this.arrowAngle + Math.atan2(y2-y1,x2-x1);
	var tempAngle2 = Math.atan2(y2-y1,x2-x1) -  this.arrowAngle;
	var ar1x = arrowx - (Math.cos(tempAngle) * this.arrowLen)
	var ar1y = arrowy - (Math.sin(tempAngle) * this.arrowLen);

	var ar2x = arrowx - (Math.cos(tempAngle2) * this.arrowLen);
	var ar2y = arrowy - (Math.sin(tempAngle2) * this.arrowLen);

	//console.log(this.arrowAngle+" "+(Math.cos(this.arrowAngle))+" "+ar1x+" "+ar1y+" "+((Math.cos(this.arrowAngle) * this.arrowLen)));

	this.arrow = new Kinetic.Circle({
                x: ar1x,
                y: ar1y,
                radius: 4,
                stroke: '#666',
                fill: 'red',
                strokeWidth: 2,
                draggable: true
            });

	this.graphics = new Kinetic.Line({
	        points: [x1,y1,arrowx,arrowy,ar1x,ar1y,arrowx,arrowy,ar2x,ar2y,arrowx,arrowy,anx1,any1,anx2,any2,x2,y2],
	        stroke: 'black',
	        strokeWidth: 2,
	        lineCap: 'round',
	        lineJoin: 'round',
	        tension : 0.1
	});

	if(inCell == outCell){
	    this.graphics.setTension(1);
	}

    this.graphics.on('mouseover', function() {
        document.body.style.cursor = 'pointer';
        this.stroke("green");
        this.strokeWidth(7);
        ref.graph.getLayer().draw();
   	});

    this.graphics.on('mouseout', function() {
      document.body.style.cursor = 'default';
      this.stroke("black");
      this.strokeWidth(2);
      ref.graph.getLayer().draw();
    });

    this.textInfo = new Kinetic.Text({
		x: (ref.inCell.graphics.getPosition().x+ref.outCell.graphics.getPosition().x)/2,
		y: (ref.inCell.graphics.getPosition().y+ref.outCell.graphics.getPosition().y)/2,
		text: '('+ref.inputRead+','+ref.outputWrite+','+ref.orientation+')',
		fontSize: 15,
		fontFamily: 'Calibri',
		fill: 'green',
	});

	this.graphics.on('click',function(e){
		if(e.evt.which == 1){
			if(ref.graph.isConnecting){
				ref.graph.isConnecting = false;
			}
			ref.graph.itemSelected(ref);
		}else{
			if(e.evt.which == 3){
				ref.graph.itemSelected(ref);
				ref.graph.showCellMenu(ref,e.evt.clientX,e.evt.clientY);
			}
		}
	});

    //Methods
	this.draw = function(){
		this.graph.getLayer().add(this.graphics);
		this.graph.getLayer().add(this.textInfo);
		this.graph.getLayer().add(this.anchor);
		this.graph.getLayer().add(this.anchor2);
		this.graphics.setZIndex(1);
		this.graph.getLayer().draw();
	}

	this.updatePosition = function(){
		var x1 = this.inCell.graphics.getPosition().x;
		var y1 = this.inCell.graphics.getPosition().y;
		var x2 = this.outCell.graphics.getPosition().x;
		var y2 = this.outCell.graphics.getPosition().y;
		var anx1 = this.anchor.getPosition().x;
		var any1 = this.anchor.getPosition().y;
		var anx2 = this.anchor2.getPosition().x;
		var any2 = this.anchor2.getPosition().y;

		var arrowx = Math.abs(x1+(x2-x1)/3);
		var arrowy = Math.abs(y1+(y2-y1)/3);
		var tempAngle = this.arrowAngle + Math.atan2(y2-y1,x2-x1);
		var tempAngle2 = Math.atan2(y2-y1,x2-x1) -  this.arrowAngle;
		var ar1x = arrowx - (Math.cos(tempAngle) * this.arrowLen)
		var ar1y = arrowy - (Math.sin(tempAngle) * this.arrowLen);

		var ar2x = arrowx - (Math.cos(tempAngle2) * this.arrowLen);
		var ar2y = arrowy - (Math.sin(tempAngle2) * this.arrowLen);

		this.graphics.setPoints([x1,y1,arrowx,arrowy,ar1x,ar1y,arrowx,arrowy,ar2x,ar2y,arrowx,arrowy,anx1,any1,anx2,any2,x2,y2]);
		
		this.textInfo.position({
			x : (ref.anchor.getPosition().x+ref.anchor2.getPosition().x)/2,
			y : ((ref.anchor.getPosition().y+ref.anchor2.getPosition().y)/2)-15
		});

		this.anchor.position({
			x : (ref.inCell.graphics.getPosition().x+ref.outCell.graphics.getPosition().x)/2,
			y : ((ref.inCell.graphics.getPosition().y+ref.outCell.graphics.getPosition().y)/2)
		});

		this.anchor2.position({
			x : (ref.anchor.getPosition().x+ref.outCell.graphics.getPosition().x)/2,
			y : ((ref.anchor.getPosition().y+ref.outCell.graphics.getPosition().y)/2)
		});

		this.graph.getLayer().draw();
	}

	this.updatePosition2 = function(){
		var x1 = this.inCell.graphics.getPosition().x;
		var y1 = this.inCell.graphics.getPosition().y;
		var x2 = this.outCell.graphics.getPosition().x;
		var y2 = this.outCell.graphics.getPosition().y;
		var anx1 = this.anchor.getPosition().x;
		var any1 = this.anchor.getPosition().y;
		var anx2 = this.anchor2.getPosition().x;
		var any2 = this.anchor2.getPosition().y;

		var arrowx = Math.abs(x1+(x2-x1)/3);
		var arrowy = Math.abs(y1+(y2-y1)/3);
		var tempAngle = this.arrowAngle + Math.atan2(y2-y1,x2-x1);
		var tempAngle2 = Math.atan2(y2-y1,x2-x1) -  this.arrowAngle;
		var ar1x = arrowx - (Math.cos(tempAngle) * this.arrowLen)
		var ar1y = arrowy - (Math.sin(tempAngle) * this.arrowLen);

		var ar2x = arrowx - (Math.cos(tempAngle2) * this.arrowLen);
		var ar2y = arrowy - (Math.sin(tempAngle2) * this.arrowLen);

		this.graphics.setPoints([x1,y1,arrowx,arrowy,ar1x,ar1y,arrowx,arrowy,ar2x,ar2y,arrowx,arrowy,anx1,any1,anx2,any2,x2,y2]);
		
		this.textInfo.position({
			x : (ref.anchor.getPosition().x+ref.anchor2.getPosition().x)/2,
			y : ((ref.anchor.getPosition().y+ref.anchor2.getPosition().y)/2)-15
		});
		this.graph.getLayer().draw();
	}

	this.updateText = function(){
		this.textInfo.text('('+this.inputRead+','+this.outputWrite+','+this.orientation+')');
	}

	this.remove = function(){
		this.graphics.remove();
		this.textInfo.remove();
		this.anchor.remove();
		this.anchor2.remove();
	}
}

//******************* Simulator Class ******************************

var Simulator = function(graph,input,time){
	console.log(time);
	//Arttributes
	var ref = this;
	this.symbols =  input;
	this.lastSymbolIndex = -1;
	this.currentSymbolIndex = 0;
	this.graph = graph;
	this.lastState = graph.initialState;
	this.currentState = graph.initialState;
	this.waitTime = time;
	this.run = -1;
	this.paused = false;
	this.autom = true;

	//Methods
	this.nextStep = function(auto){
		if(!this.paused){
			for(i = 0 ; i < this.currentState.outEdges.length ; i++){
				edge =  this.currentState.outEdges[i];
				if( this.symbols[this.currentSymbolIndex] == edge.inputRead ){
					//console.log("State : "+edge.inCell.stateName+" ; Read : "+edge.inputRead+" ; Write : "+edge.outputWrite+" ; Goto : "+edge.orientation);
					$("#rub-info").html("State : "+edge.inCell.stateName+" ; Read : "+edge.inputRead+" ; Write : "+edge.outputWrite+" ; Goto : "+edge.orientation);
					this.lastState = this.currentState;
					this.currentState = edge.outCell;
					this.symbols = this.symbols.replaceAt(this.currentSymbolIndex,edge.outputWrite);
					$("#rubbon>li:eq("+this.currentSymbolIndex+")>span").html(edge.outputWrite);
					this.lastSymbolIndex = this.currentSymbolIndex;
					if( edge.orientation == "Left" ){
						this.currentSymbolIndex--;
						if(this.currentSymbolIndex == -1){
							this.lastSymbolIndex = 1;
							this.symbols = "&"+this.symbols;
							this.currentSymbolIndex = 0;
							$("#rubbon").prepend("<li><span class='label label-info' style='font-size:16px'>&</span></li>");
						}
					}else{
						this.currentSymbolIndex++;
						if(this.currentSymbolIndex >= this.symbols.length){
							this.symbols = this.symbols+"&";
							$("#rubbon").append("<li><span class='label label-info' style='font-size:16px'>&</span></li>");
						}
					}
					if(auto){
						setTimeout(function(){
							ref.unHightlightSymbol(ref.lastSymbolIndex);
							ref.lastState.stopAnimation();
							ref.simulate(true);
						},this.waitTime);
					}
					return;
				}
			}
			this.lastState.stopAnimation();
			return -1;
		}else{
			if(auto){
				setTimeout(function(){
					ref.simulate(ref.autom);
				},this.waitTime);
			}
		}
	}

	this.simulate = function(auto){
		this.currentState.startAnimation();
		this.hightlightSymbol(this.currentSymbolIndex);
		result = this.nextStep(auto);
	}

	this.hightlightSymbol = function(index){
		$("#rubbon>li:eq("+index+")>span").removeClass("label-info");
		$("#rubbon>li:eq("+index+")>span").addClass("label-danger");
	}

	this.unHightlightSymbol = function(index){
		$("#rubbon>li:eq("+index+")>span").removeClass("label-danger");
		$("#rubbon>li:eq("+index+")>span").addClass("label-info");
	}
}

String.prototype.replaceAt = function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
}