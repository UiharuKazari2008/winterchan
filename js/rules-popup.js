/*
 * rules-popup.js
 * https://github.com/mkwia/lainchan/js/rules-popup.js
 *
 * Forces user to accept rules from /templates/rules.html on first welcome
 *
 * 2016 mkwia <github.com/mkwia>
 *
 * Usage:
 *   $config['additional_javascript'][] = 'js/jquery.min.js';
 *   $config['additional_javascript'][] = 'js/rules-popup.js';
 *
 */

$(window).ready(function() {
  if (typeof localStorage.rulesAcceptedRev1 === "undefined") {

    $("body").html("<body class='rules'> \
	  	<div id='rules-section'> \
	  		<div class='rules-top'><h1>Winterchan Rule Agreement</h1></div> \
	  		<div class='rules-content-wrapper'> \
	  			<div id='rules-content'></div> \
	  		</div> \
	  		<div id='rules-bottom'></div> \
	  	</div> \
	  </body>");

	$("#rules-content").load("/templates/rules-new.html");

	$("#rules-bottom")
    	.append("<div><a class='rules-bottom-link' href='#' onClick=\"localStorage.rulesAcceptedRev1 = 1; location.reload();\">I ACCEPT THE RULES.</a></div>")
	}
})
