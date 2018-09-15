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
function acceptedrules_guro() {
	localStorage.setItem('readRulesGuro', rule_rev_guro);
	document.getElementById('guro-rules-banner').style.display = 'none';
	return false;
}
$(window).ready(function() {
  $('hr:first').before("<div style='display: none;' id='guro-rules-banner' class='rules'> \
		<hr/> \
	  	<div id='rules-section'> \
	  		<div class='rules-content-wrapper'> \
	  			<div id='rules-content'></div> \
	  		</div> \
	  		<div id='rules-bottom'> \
		  		<a class='reply-button' href='#' onClick=\"acceptedrules_guro();\">I ACCEPT THE RULES ✅</a> \
	  		</div> \
	  	</div> \
	  </div>");
	$("#rules-content").load("/templates/rules-guro.html");
  if ( localStorage.readRulesGuro == rule_rev_guro ) {
	  document.getElementById('guro-rules-banner').style.display = 'none';	
	} else {
		document.getElementById('guro-rules-banner').style.display = 'block';	
    
  }
})
