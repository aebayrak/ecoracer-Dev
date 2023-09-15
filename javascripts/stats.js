/**
 * @author mrdoob / http://mrdoob.com/
 */

var Stats = function () {

	var sigMin = Infinity, sigMax = 0;
	var frames = 0;

	var container = document.createElement( 'div' );
	container.id = 'stats';
	container.style.cssText = 'width:400px;opacity:0.9;cursor:pointer';

	var sigDiv = document.createElement( 'div' );
	sigDiv.id = 'sig';
	sigDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;background-color:#fff;display:block';
	container.appendChild( sigDiv );

	var sigText = document.createElement( 'div' );
	sigText.id = 'sigText';
	sigText.style.cssText = 'color:#000;font-family:Helvetica,Arial,sans-serif;font-size:9px;font-weight:bold;line-height:15px';
	sigText.innerHTML = 'SIG';
	sigDiv.appendChild( sigText );

	var sigGraph = document.createElement( 'div' );
	sigGraph.id = 'sigGraph';
	sigGraph.style.cssText = 'position:relative;width:390px;height:50px;background-color:#000';
	sigDiv.appendChild( sigGraph );
	
	while ( sigGraph.children.length < 390 ) {

		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:1px;height:50px;float:left;background-color:#eee';
		sigGraph.appendChild( bar );

	}

	var updateGraph = function ( dom, value ) {

		var child = dom.appendChild( dom.firstChild );
		child.style.height = value + 'px';

	}

	return {

		domElement: container,
	
		begin: function () {
			
			setInterval( function () {
//				var sig = Math.round(motorbar3.w*motor3.jAcc*60/fr*m2m*px2m*px2m/t2t/t2t);
				var sig = Math.round(consumption/3600)/1000;
//				var sig = Math.round(Math.abs(motor3.jAcc*60/fr*m2m*px2m*px2m/t2t/t2t));
//				var sig = Math.round(Math.abs(max_power3/Math.max(0,motorbar3.w)));
				sigMin = 0;
				sigMax = 4.4*2; // 2 * Prius battery 4.4kwh
				
				scaled_sig = (sig-sigMin)/(sigMax-sigMin);
				sigText.textContent = sig + ' kwh (' + sigMin + '-' + sigMax + ')';
				updateGraph( sigGraph, Math.min( 50, 50 - ( scaled_sig ) * 50 ) );

				frames ++;

        	}, 1000 / 500 );

		},

		end: function () {

		}

	}

};
