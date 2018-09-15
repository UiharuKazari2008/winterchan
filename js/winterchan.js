function toggle(id, id2) {
      var state = document.getElementById(id).style.display;
      if (state == 'none') {
	    document.getElementById(id).style.display = 'block';
			document.getElementById(id2).style.display = 'none';
      } else {
    	document.getElementById(id).style.display = 'none';
  	}
  	return false;
}

/*
 * expand-all-images.js
 * https://github.com/savetheinternet/Tinyboard/blob/master/js/expand-all-images.js
 *
 * Adds an "Expand all images" button to the top of the page.
 *
 * Released under the MIT license
 * Copyright (c) 2012-2013 Michael Save <savetheinternet@tinyboard.org>
 * Copyright (c) 2013-2014 Marcin Łabanowski <marcin@6irc.net>
 * Copyright (c) 2014 sinuca <#55ch@rizon.net>
 *
 * Usage:
 *   $config['additional_javascript'][] = 'js/jquery.min.js';
 *   $config['additional_javascript'][] = 'js/inline-expanding.js';
 *   $config['additional_javascript'][] = 'js/expand-all-images.js';
 *
 */

if (active_page == 'ukko' || active_page == 'thread' || active_page == 'index')
onready(function(){
	$('div#expand-all-images a')
		.text(_('⚡ Expand Images'))
		.click(function() {
			$('a img.post-image').each(function() {
				if (!$(this).parent()[0].dataset.expanded)
					$(this).parent().click();
			});

			if (!$('#shrink-all-images').length) {
				document.getElementById('expand-all-images').style.display = 'none';
				$('#bottom-bar-settings-area').prepend('<div id="shrink-all-images" style="text-align:right; display: inline-block;"><a class="settings-button settings-button-on" href="javascript:void(0)"></a></div>');
			}

			$('div#shrink-all-images a')
				.text(_('Shrink Images'))
				.click(function(){
					$('a img.post-image').each(function() {
						if ($(this).parent()[0].dataset.expanded)
							$(this).parent().click();
					});
					document.getElementById('expand-all-images').style.display = 'inline-block';
					$(this).parent().remove();
				});
		});
});

/*
 * auto-reload.js
 * https://github.com/savetheinternet/Tinyboard/blob/master/js/auto-reload.js
 *
 * Brings AJAX to Tinyboard.
 *
 * Released under the MIT license
 * Copyright (c) 2012 Michael Save <savetheinternet@tinyboard.org>
 * Copyright (c) 2013-2014 Marcin Łabanowski <marcin@6irc.net>
 * Copyright (c) 2013 undido <firekid109@hotmail.com>
 * Copyright (c) 2014 Fredrick Brennan <admin@8chan.co>
 *
 * Usage:
 *   $config['additional_javascript'][] = 'js/jquery.min.js';
 *   //$config['additional_javascript'][] = 'js/titlebar-notifications.js';
 *   $config['additional_javascript'][] = 'js/auto-reload.js';
 *
 */

au = false;
auto_reload_enabled = true; // for watch.js to interop

function makeIcon(){
    if(au) return;
    au = true;
    $("link[rel='icon']").attr("href", "../static/favicon_au.png");
}

$(document).ready(function(){
    if($('div.banner').length == 0)
	return; // not index

    if($(".post.op").size() != 1)
	return; //not thread page

    var countdown_interval;

    // Add an update link
    $(".threadlinks span:last-child").after("<span id='updater'><a href='#' id='update_thread' >"+_("🔄 Update")+"</a> (<input type='checkbox' id='auto_update_status' checked> "+_("Auto")+") <span id='update_secs'></span></span>");

    // Grab the settings
    var settings = new script_settings('auto-reload');
    var poll_interval_mindelay        = settings.get('min_delay_bottom', 5000);
    var poll_interval_maxdelay        = settings.get('max_delay', 600000);
    var poll_interval_errordelay      = settings.get('error_delay', 30000);

    // number of ms to wait before reloading
    var poll_interval_delay = poll_interval_mindelay;
    var poll_current_time = poll_interval_delay;

    var end_of_page = false;

    var new_posts = 0;
    var first_new_post = null;

    var title = document.title;

    if (typeof update_title == "undefined") {
	var update_title = function() {
	    if (new_posts) {
		document.title = "("+new_posts+") "+title;
	    } else {
		document.title = title;
	    }
	};
    }

    if (typeof add_title_collector != "undefined")
	add_title_collector(function(){
	    return new_posts;
	});

    var window_active = true;
    $(window).focus(function() {
	window_active = true;
	recheck_activated();

	// Reset the delay if needed
	if(settings.get('reset_focus', true)) {
	    poll_interval_delay = poll_interval_mindelay;
	}
    });
    $(window).blur(function() {
	window_active = false;
    });


    $('#auto_update_status').click(function() {
	if($("#auto_update_status").is(':checked')) {
	    auto_update(poll_interval_mindelay);
	} else {
	    stop_auto_update();
	    $('#update_secs').text("");
	}

    });


    var decrement_timer = function() {
	poll_current_time = poll_current_time - 1000;
	$('#update_secs').text(poll_current_time/1000);

	if (poll_current_time <= 0) {
	    poll(manualUpdate = false);
	}
    }

    var recheck_activated = function() {
	if (new_posts && window_active &&
	    $(window).scrollTop() + $(window).height() >=
	    $('footer').position().top) {

	    new_posts = 0;
	}
	update_title();
	first_new_post = null;
    };

    // automatically updates the thread after a specified delay
    var auto_update = function(delay) {
	clearInterval(countdown_interval);

	poll_current_time = delay;
	countdown_interval = setInterval(decrement_timer, 1000);
	$('#update_secs').text(poll_current_time/1000);
    }

    var stop_auto_update = function() {
	clearInterval(countdown_interval);
    }

    var epoch = (new Date).getTime();
    var epochold = epoch;

    var timeDiff = function (delay) {
	if((epoch-epochold) > delay) {
	    epochold = epoch = (new Date).getTime();
	    return true;
	}else{
	    epoch = (new Date).getTime();
	    return;
	}
    }

    var poll = function(manualUpdate) {
	stop_auto_update();
	$('#update_secs').text(_("Updating..."));

	$.ajax({
	    url: document.location,
	    success: function(data) {
		var loaded_posts = 0;	// the number of new posts loaded in this update
		$(data).find('div.postcontainer').each(function() {
		    var id = $(this).attr('id').substring(2);
		    if($('#' + id).length == 0) {
			if (!new_posts) {
			    first_new_post = this;
			    makeIcon();
			}
			$(this).insertAfter($('div.postcontainer:last').next()).after('<br class="clear">');
			new_posts++;
			loaded_posts++;
			$(document).trigger('new_post', this);
			recheck_activated();
		    }
		});
		time_loaded = Date.now(); // interop with watch.js


		if ($('#auto_update_status').is(':checked')) {
		    // If there are no new posts, double the delay. Otherwise set it to the min.
		    if(loaded_posts == 0) {
			// if the update was manual, don't increase the delay
			if (manualUpdate == false) {
			    poll_interval_delay *= 2;

			    // Don't increase the delay beyond the maximum
			    if(poll_interval_delay > poll_interval_maxdelay) {
				poll_interval_delay = poll_interval_maxdelay;
			    }
			}
		    } else {
			poll_interval_delay = poll_interval_mindelay;
		    }

		    auto_update(poll_interval_delay);
		} else {
		    // Decide the message to show if auto update is disabled
		    if (loaded_posts > 0)
			$('#update_secs').text(fmt(_("Thread updated with {0} new post(s)"), [loaded_posts]));
		    else
			$('#update_secs').text(_("No new posts found"));
		}
	    },
	    error: function(xhr, status_text, error_text) {
		if (status_text == "error") {
		    if (error_text == "Not Found") {
			$('#update_secs').text(_("Thread deleted or pruned"));
			$('#auto_update_status').prop('checked', false);
			$('#auto_update_status').prop('disabled', true); // disable updates if thread is deleted
			return;
		    } else {
			$('#update_secs').text("Error: "+error_text);
		    }
		} else if (status_text) {
		    $('#update_secs').text(_("Error: ")+status_text);
		} else {
		    $('#update_secs').text(_("Unknown error"));
		}

		// Keep trying to update
		if ($('#auto_update_status').is(':checked')) {
		    poll_interval_delay = poll_interval_errordelay;
		    auto_update(poll_interval_delay);
		}
	    }
	});

	return false;
    };

    $(window).scroll(function() {
	recheck_activated();

	// if the newest post is not visible
	if($(this).scrollTop() + $(this).height() <
	   $('div.post:last').position().top + $('div.post:last').height()) {
	    end_of_page = false;
	    return;
	} else {
	    if($("#auto_update_status").is(':checked') && timeDiff(poll_interval_mindelay)) {
		poll(manualUpdate = true);
	    }
	    end_of_page = true;
	}
    });

    $('#update_thread').on('click', function() { poll(manualUpdate = true); return false; });

    if($("#auto_update_status").is(':checked')) {
	auto_update(poll_interval_delay);
    }
});

/*
 * upload-selection.js - makes upload fields in post form more compact
 * https://github.com/vichan-devel/Tinyboard/blob/master/js/upload-selection.js
 *
 * Released under the MIT license
 * Copyright (c) 2014 Marcin Łabanowski <marcin@6irc.net>
 *
 * Usage:
 *   $config['additional_javascript'][] = 'js/jquery.min.js';
 *   //$config['additional_javascript'][] = 'js/wpaint.js';
 *   $config['additional_javascript'][] = 'js/upload-selection.js';
 *                                                  
 */

$(function(){
  var enabled_file = true;
  var enabled_url = $("#upload_url").length > 0;
  var enabled_embed = $("#upload_embed").length > 0;
  var enabled_oekaki = typeof window.oekaki != "undefined";

  var disable_all = function() {
    $("#upload").hide();
    $("[id^=upload_file]").hide();
    $(".file_separator").hide();
    $("#upload_url").hide();
    $("#upload_embed").hide();
    $(".add_image").hide();
    $(".dropzone-wrap").hide();

    $('[id^=upload_file]').each(function(i, v) {
        $(v).val('');
    });

    if (enabled_oekaki) {
      if (window.oekaki.initialized) {
        window.oekaki.deinit();
      }
    }
  };

  enable_file = function() {
    disable_all();
    $("#upload").show();
    $(".dropzone-wrap").show();
    $(".file_separator").show();
    $("[id^=upload_file]").show();
    $(".add_image").show();
  };

  enable_url = function() {
    disable_all();
    $("#upload").show();
    $("#upload_url").show();

    $('label[for="file_url"]').html(_("URL"));
  };

  enable_embed = function() {
    disable_all();
    $("#upload_embed").show();
  };

  enable_oekaki = function() {
    disable_all();

    window.oekaki.init();
  };

  if (enabled_url || enabled_embed || enabled_oekaki) {
    $("<tr><th>"+_("Select")+"</th><td id='upload_selection'></td></tr>").insertBefore("#upload");
    var my_html = "<a href='javascript:void(0)' onclick='enable_file(); return false;'>"+_("Upload")+"</a>";
    if (enabled_url) {
      my_html += " / <a href='javascript:void(0)' onclick='enable_url(); return false;'>"+_("URL")+"</a>";
    }
    if (enabled_embed) {
      my_html += " / <a href='javascript:void(0)' onclick='enable_embed(); return false;'>"+_("YouTube")+"</a>";
    }
    if (enabled_oekaki) {
      my_html += " / <a href='javascript:void(0)' onclick='enable_oekaki(); return false;'>"+_("Draw")+"</a>";

      $("#confirm_oekaki_label").hide();
    }
    $("#upload_selection").html(my_html);

    enable_file();
  }
});

if (active_page == 'index' || active_page == 'thread')
$(function(){

  var gallery_view = false;
  // Is gallery enabled
/*
  if (localStorage.getItem("GalleryEnabled") === '1') {
	var gallery_view = true;
	// Enabele the objects
	} else {
    var gallery_view = false;
	}
*/

  $('#gallery-view a').html(gallery_view ? _("🖼 Gallery ON") : _("🖼 Gallery OFF")).click(function() {
	gallery_view = !gallery_view;
	$(this).html(gallery_view ? _("🖼 Gallery ON") : _("🖼 Gallery OFF"));
	toggle_gview(document);
  });

  var toggle_gview = function(elem) {
	if (gallery_view) {
		localStorage.setItem('GalleryEnabled', 1);
	  $(elem).find('img.post-image').parent().each(function() { 
		this.oldonclick = this.onclick;
		this.onclick = handle_click;
		$(this).attr('data-galid', Math.random());
	  });
	}
	else {
		localStorage.setItem('GalleryEnabled', 0);
	  $(elem).find('img.post-image').parent().each(function() {
		if (this.onclick == handle_click) this.onclick = this.oldonclick;
	  });
	}
  };

  $(document).on('new_post', toggle_gview);

  var gallery_opened = false;

  var handle_click = function(e) {
	e.stopPropagation();
	e.preventDefault();

	if (!gallery_opened) open_gallery();

	gallery_setimage($(this).attr('data-galid'));
  };

  var handler, images, active, toolbar;

  var open_gallery = function() {
	$('body').css('overflow', 'hidden');

	gallery_opened = true;

	handler = $("<div id='alert_handler'></div>").hide().appendTo('body').css('text-align', 'left');

	$("<div id='alert_background'></div>").click(close_gallery).appendTo(handler);

	images = $("<div id='gallery_images'></div>").appendTo(handler);
	toolbar = $("<div id='gallery_toolbar'></div>").appendTo(handler);
	active = $("<div id='gallery_main'></div>").appendTo(handler);

	active.on('click', function() {
	  close_gallery();
	});

	$('img.post-image').parent().each(function() {
	  var thumb = $(this).find('img').attr('src');

	  var i = $('<img>').appendTo(images);
	  i.attr('src', thumb);
	  i.attr('data-galid-th', $(this).attr('data-galid'));

	  i.on('click', function(e) {
		gallery_setimage($(this).attr('data-galid-th'));
	  });
	});

	$("<a class='reply-button' href='javascript:void(0)'><b>[ Exit ]</b></div>")
	.click(close_gallery).appendTo(toolbar);

	$('body').on('keydown.gview', function(e) {
	  if (e.which == 39 || e.which == 40) { // right or down arrow
		gallery_setimage(+1);
		e.preventDefault();
	  }
	  else if (e.which == 37 || e.which == 38) { // left or up arrow
		gallery_setimage(-1);
		e.preventDefault();
	  }
	});

	handler.fadeIn(400);
  };

  var gallery_setimage = function(a) {
	if (a == +1 || a == -1) {
	  var meth = (a == -1) ? 'prev' : 'next';
	  a = $('#gallery_images img.active')[meth]().attr('data-galid-th');
	  if (!a) return;
	}

	$('#gallery_images img.active').removeClass('active');

	var thumb = $('#gallery_images [data-galid-th="'+a+'"]');
	var elem = $('a[data-galid="'+a+'"]');

	thumb.addClass('active');

	var topscroll = thumb.position().top + images.scrollTop();
	topscroll -= images.height() / 2;
	topscroll += thumb.height() / 2;
	images.animate({'scrollTop': topscroll}, 300);

	var img = elem.attr('href');

	active.find('img, video').fadeOut(200, function() { $(this).remove(); });

	var i;
	if (img.match(/player\.php/)) {
	  img = img.replace(/.*player\.php\?v=|&t=.*/g, '');
	}
	if (img.match(/\.webm$|\.mp4$|\.ogv$/i)) { // We are handling video nao
	  i = $('<video>');
	  i.attr('src', img);
	  i.attr('autoplay', true);
	  i.attr('controls', true);
	  i.appendTo(active);
	  i.hide();
	}
	else { // Just a plain image
	  i = $('<img>');
	  i.attr('src', img);
	  i.appendTo(active);
	  i.hide();
	}

	// Let's actually preload the next few images
	var nextimg = $('#gallery_images active');
	for (var j = 0; j < 3; j++) { 
	  nextimg = nextimg.next();
	  var attr;
	  if (attr = nextimg.attr('data-gaild-th')) {
		var href = $('a[data-galid="'+attr+'"]').attr('href');
		if (href.match(/\.webm|\.mp4|\.ogv/i)) { j--; continue; }
		if ($('[data-galid-preload="'+attr+'"]').length) continue;
		var img = $('<img>').attr('src', href).attr('data-galid-preload', attr).hide().appendTo('body').on('load', function() { $(this).remove(); });
	  }
	  else break;
	}

	i.one('load canplay', function() {
	  i.css('left', 'calc(50% - '+i.width()+'px / 2)');
	  i.css('top', 'calc(50% - '+i.height()+'px / 2)');
	  i.fadeIn(200);
	}).on('click', function(e) {
	  e.stopPropagation();
	  gallery_setimage(+1);
	});
  };

  var close_gallery = function() {
	$('body').css('overflow', 'auto');

	gallery_opened = false;

	$('body').off('keydown.gview');

	handler.fadeOut(400, function() { handler.remove(); });
  };

});

/*
 * multi-image.js - Add support for multiple images to the post form
 *
 * Copyright (c) 2014 Fredrick Brennan <admin@8chan.co>
 *
 * Usage:
 *   $config['max_images'] = 3;
 *   $config['additional_javascript'][] = 'js/jquery.min.js';
 *   $config['additional_javascript'][] = 'js/multi-image.js';
 */

function multi_image() {
    $('input[type=file]').after('<a href="#" class="add_image">+ add files...</a>');
    
    $(document).on('click', 'a.add_image', function(e) {
        e.preventDefault();

        var images_len = $('form:not([id="quick-reply"]) [type=file]').length;
        
        if (!(images_len >= max_images)) {
            var new_file = '<br class="file_separator"/><input type="file" name="file'+(images_len+1)+'" id="upload_file'+(images_len+1)+'">';

            $('[type=file]:last').after(new_file);
            if ($("#quick-reply").length) {
                $('form:not(#quick-reply) [type=file]:last').after(new_file);
            }
            if (typeof setup_form !== 'undefined') setup_form($('form[name="post"]'));
        }
    })
}

if (active_page == 'thread' || active_page == 'index' && max_images > 1) {
	$(document).ready(multi_image);
}

/*
 * expand.js
 * https://github.com/savetheinternet/Tinyboard/blob/master/js/expand.js
 *
 * Released under the MIT license
 * Copyright (c) 2012-2013 Michael Save <savetheinternet@tinyboard.org>
 * Copyright (c) 2013 Czterooki <czterooki1337@gmail.com>
 * Copyright (c) 2013-2014 Marcin Łabanowski <marcin@6irc.net>
 *
 * Usage:
 *   $config['additional_javascript'][] = 'js/jquery.min.js';
 *   $config['additional_javascript'][] = 'js/expand.js';
 *
 */

$(document).ready(function(){
	if($('span.omitted').length == 0)
		return; // nothing to expand

	var do_expand = function() {
		$(this)
			.html($(this).text().replace(_("Click reply to view."), '<a class="reply-button" style="float: none; display: inline-block; font-style: normal;" href="javascript:void(0)">'+_("Show Posts ⬇")+'</a>'))
			.find('a').click(window.expand_fun = function() {
				var thread = $(this).parents('[id^="thread_"]');
				var id = thread.attr('id').replace(/^thread_/, '');
				$.ajax({
					url: thread.find('p.intro a.post_no:first').attr('href'),
					context: document.body,
					success: function(data) {
						var last_expanded = false;
						$(data).find('div.post.reply').each(function() {
							thread.find('div.hidden').remove();
							var post_in_doc = thread.find('#' + $(this).attr('id'));
							if(post_in_doc.length == 0) {
								if(last_expanded) {
									$(this).addClass('expanded').insertAfter(last_expanded).before('<br class="expanded">');
								} else {
									$(this).addClass('expanded').insertAfter(thread.find('div.post:first')).after('<br class="expanded">');
								}
								last_expanded = $(this);
								$(document).trigger('new_post', this);
							} else {
								last_expanded = post_in_doc;
							}
						});
						

						thread.find("span.omitted").css('display', 'none');

						$('<span class="omitted hide-expanded"><a class="reply-button" style="float: none; font-style: normal;" href="javascript:void(0)">' + _('Hide Posts ⬆') + '</a></span>')
							.insertAfter(thread.find('.op div.body, .op span.omitted').last())
							.click(function() {
								thread.find('.expanded').remove();
								$(this).parent().find(".omitted:not(.hide-expanded)").css('display', '');
								$(this).parent().find(".hide-expanded").remove();
							});
					}
				});
			});
	}

	$('div.post.op span.omitted').each(do_expand);

	$(document).on("new_post", function(e, post) {
		if (!$(post).hasClass("reply")) {
			$(post).find('div.post.op span.omitted').each(do_expand);
		}
	});
});

/* This file is dedicated to the public domain; you may do as you wish with it. */

if (typeof _ == 'undefined') {
  var _ = function(a) { return a; };
}

// Default settings
var defaultSettings = {
    "videoexpand": true,
    "videohover": false,
    "videovolume": 1.0
};

// Non-persistent settings for when localStorage is absent/disabled
var tempSettings = {};

// Scripts obtain settings by calling this function
function setting(name) {
    if (localStorage) {
        if (localStorage[name] === undefined) return defaultSettings[name];
        return JSON.parse(localStorage[name]);
    } else {
        if (tempSettings[name] === undefined) return defaultSettings[name];
        return tempSettings[name];
    }
}

// Settings should be changed with this function
function changeSetting(name, value) {
    if (localStorage) {
        localStorage[name] = JSON.stringify(value);
    } else {
        tempSettings[name] = value;
    }
}

// Create settings menu
var settingsMenu = document.createElement("div");
var prefix = "", suffix = "", style = "";
if (window.Options) {
  var tab = Options.add_tab("webm", "video-camera", _("WebM"));
  $(settingsMenu).appendTo(tab.content);
}
else {
  prefix = '<a class="unimportant settings-button" style="display: none;" href="#" onclick="toggle_webmsettings()">'+_('WebM Settings')+'</a>';
  settingsMenu.style.textAlign = "right";
  settingsMenu.style.background = "transparent";
  suffix = '</div>';
  style = 'display: none; text-align: left; position: absolute; right: 1em; margin-left: -999em; margin-top: -1px; padding-top: 1px; background: transparent;';
}

settingsMenu.innerHTML = prefix
    + '<div style="'+style+'">'
    + '<label><input type="checkbox" name="videoexpand">'+_('Expand videos inline')+'</label><br>'
    + '<label><input type="checkbox" name="videohover">'+_('Play videos on hover')+'</label><br>'
    + '<label><input type="range" name="videovolume" min="0" max="1" step="0.01" style="width: 4em; height: 1ex; vertical-align: middle; margin: 0px;">'+_('Default volume')+'</label><br>'
    + suffix;

function refreshSettings() {
    var settingsItems = settingsMenu.getElementsByTagName("input");
    for (var i = 0; i < settingsItems.length; i++) {
        var control = settingsItems[i];
        if (control.type == "checkbox") {
            control.checked = setting(control.name);
        } else if (control.type == "range") {
            control.value = setting(control.name);
        }
    }
}

function setupControl(control) {
    if (control.addEventListener) control.addEventListener("change", function(e) {
        if (control.type == "checkbox") {
            changeSetting(control.name, control.checked);
        } else if (control.type == "range") {
            changeSetting(control.name, control.value);
        }
    }, false);
}

refreshSettings();
var settingsItems = settingsMenu.getElementsByTagName("input");
for (var i = 0; i < settingsItems.length; i++) {
    setupControl(settingsItems[i]);
}

//if (settingsMenu.addEventListener && !window.Options) {
//    settingsMenu.addEventListener("mouseover", function(e) {
//        refreshSettings();
//        settingsMenu.getElementsByTagName("a")[0].style.fontWeight = "bold";
//        settingsMenu.getElementsByTagName("div")[0].style.display = "block";
//    }, false);
//    settingsMenu.addEventListener("mouseout", function(e) {
//        settingsMenu.getElementsByTagName("a")[0].style.fontWeight = "normal";
//        settingsMenu.getElementsByTagName("div")[0].style.display = "none";
//    }, false);
//}


function toggle_webmsettings() {
    var state = settingsMenu.getElementsByTagName("div")[0].style.display;
    if (state == 'none') {
		refreshSettings();
		settingsMenu.getElementsByTagName("a")[0].style.fontWeight = "bold";
		settingsMenu.getElementsByTagName("div")[0].style.display = "block";
    } 
	if (state == 'block') {
		settingsMenu.getElementsByTagName("a")[0].style.fontWeight = "normal";
		settingsMenu.getElementsByTagName("div")[0].style.display = "none";
}
return false;
}

/* This file is dedicated to the public domain; you may do as you wish with it. */
/* Note: This code expects the global variable configRoot to be set. */

if (typeof _ == 'undefined') {
  var _ = function(a) { return a; };
}

function setupVideo(thumb, url) {
    if (thumb.videoAlreadySetUp) return;
    thumb.videoAlreadySetUp = true;

    var video = null;
    var videoContainer, videoHide;
    var expanded = false;
    var hovering = false;
    var loop = true;
    var loopControls = [document.createElement("span"), document.createElement("span")];
    var fileInfo = thumb.parentNode.querySelector(".fileinfo");
    var mouseDown = false;

    function unexpand() {
        if (expanded) {
            expanded = false;
            if (video.pause) video.pause();
            videoContainer.style.display = "none";
            thumb.style.display = "inline";
            video.style.maxWidth = "inherit";
            video.style.maxHeight = "inherit";
        }
    }

    function unhover() {
        if (hovering) {
            hovering = false;
            if (video.pause) video.pause();
            videoContainer.style.display = "none";
            video.style.maxWidth = "inherit";
            video.style.maxHeight = "inherit";
        }
    }

    // Create video element if does not exist yet
    function getVideo() {
        if (video == null) {
            video = document.createElement("video");
            video.src = url;
            video.loop = loop;
            video.innerText = _("Your browser does not support HTML5 video.");

            videoHide = document.createElement("img");
            videoHide.src = configRoot + "static/collapse.gif";
            videoHide.alt = "[ - ]";
            videoHide.title = "Collapse video";
            videoHide.style.marginLeft = "-15px";
            videoHide.style.cssFloat = "left";
            videoHide.addEventListener("click", unexpand, false);

            videoContainer = document.createElement("div");
            videoContainer.style.paddingLeft = "15px";
            videoContainer.style.display = "none";
            videoContainer.appendChild(videoHide);
            videoContainer.appendChild(video);
            thumb.parentNode.insertBefore(videoContainer, thumb.nextSibling);

            // Dragging to the left collapses the video
            video.addEventListener("mousedown", function(e) {
                if (e.button == 0) mouseDown = true;
            }, false);
            video.addEventListener("mouseup", function(e) {
                if (e.button == 0) mouseDown = false;
            }, false);
            video.addEventListener("mouseenter", function(e) {
                mouseDown = false;
            }, false);
            video.addEventListener("mouseout", function(e) {
                if (mouseDown && e.clientX - video.getBoundingClientRect().left <= 0) {
                    unexpand();
                }
                mouseDown = false;
            }, false);
        }
    }

    // Clicking on thumbnail expands video
    thumb.addEventListener("click", function(e) {
        if (setting("videoexpand") && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
            getVideo();
            expanded = true;
            hovering = false;

            video.style.position = "static";
            video.style.pointerEvents = "inherit";
            video.style.display = "inline";
            videoHide.style.display = "inline";
            videoContainer.style.display = "block";
            videoContainer.style.position = "static";
            video.parentNode.parentNode.removeAttribute('style');
            thumb.style.display = "none";

            video.muted = (setting("videovolume") == 0);
            video.volume = setting("videovolume");
            video.controls = true;
            if (video.readyState == 0) {
                video.addEventListener("loadedmetadata", expand2, false);
            } else {
                setTimeout(expand2, 0);
            }
            video.play();
            e.preventDefault();
        }
    }, false);

    function expand2() {
        video.style.maxWidth = "100%";
        video.style.maxHeight = window.innerHeight + "px";
        var bottom = video.getBoundingClientRect().bottom;
        if (bottom > window.innerHeight) {
            window.scrollBy(0, bottom - window.innerHeight);
        }
        // work around Firefox volume control bug
        video.volume = Math.max(setting("videovolume") - 0.001, 0);
        video.volume = setting("videovolume");
    }

    // Hovering over thumbnail displays video
    thumb.addEventListener("mouseover", function(e) {
        if (setting("videohover")) {
            getVideo();
            expanded = false;
            hovering = true;

            var docRight = document.documentElement.getBoundingClientRect().right;
            var thumbRight = thumb.querySelector("img, video").getBoundingClientRect().right;
            var maxWidth = docRight - thumbRight - 20;
            if (maxWidth < 250) maxWidth = 250;

            video.style.position = "fixed";
            video.style.right = "0px";
            video.style.top = "0px";
            var docRight = document.documentElement.getBoundingClientRect().right;
            var thumbRight = thumb.querySelector("img, video").getBoundingClientRect().right;
            video.style.maxWidth = maxWidth + "px";
            video.style.maxHeight = "100%";
            video.style.pointerEvents = "none";

            video.style.display = "inline";
            videoHide.style.display = "none";
            videoContainer.style.display = "inline";
            videoContainer.style.position = "fixed";

            video.muted = (setting("videovolume") == 0);
            video.volume = setting("videovolume");
            video.controls = false;
            video.play();
        }
    }, false);

    thumb.addEventListener("mouseout", unhover, false);

    // Scroll wheel on thumbnail adjusts default volume
    thumb.addEventListener("wheel", function(e) {
        if (setting("videohover")) {
            var volume = setting("videovolume");
            if (e.deltaY > 0) volume -= 0.1;
            if (e.deltaY < 0) volume += 0.1;
            if (volume < 0) volume = 0;
            if (volume > 1) volume = 1;
            if (video != null) {
                video.muted = (volume == 0);
                video.volume = volume;
            }
            changeSetting("videovolume", volume);
            e.preventDefault();
        }
    }, false);

    // [play once] vs [loop] controls
    function setupLoopControl(i) {
        loopControls[i].addEventListener("click", function(e) {
            loop = (i != 0);
            thumb.href = thumb.href.replace(/([\?&])loop=\d+/, "$1loop=" + i);
            if (video != null) {
                video.loop = loop;
                if (loop && video.currentTime >= video.duration) {
                    video.currentTime = 0;
                }
            }
            loopControls[i].style.fontWeight = "bold";
            loopControls[1-i].style.fontWeight = "inherit";
        }, false);
    }

    loopControls[0].textContent = _("[play once]");
    loopControls[1].textContent = _("[loop]");
    loopControls[1].style.fontWeight = "bold";
    for (var i = 0; i < 2; i++) {
        setupLoopControl(i);
        loopControls[i].style.whiteSpace = "nowrap";
        fileInfo.appendChild(document.createTextNode(" "));
        fileInfo.appendChild(loopControls[i]);
    }
}

function setupVideosIn(element) {
    var thumbs = element.querySelectorAll("a.file");
    for (var i = 0; i < thumbs.length; i++) {
        if (/\.webm$|\.mp4$/.test(thumbs[i].pathname)) {
            setupVideo(thumbs[i], thumbs[i].href);
        } else {
            var m = thumbs[i].search.match(/\bv=([^&]*)/);
            if (m != null) {
                var url = decodeURIComponent(m[1]);
                if (/\.webm$|\.mp4$/.test(url)) setupVideo(thumbs[i], url);
            }
        }
    }
}

onready(function(){
    // Insert menu from settings.js
    if (typeof settingsMenu != "undefined" && typeof Options == "undefined")
      document.body.insertBefore(settingsMenu, document.getElementsByTagName("hr")[0]);

    // Setup Javascript events for videos in document now
    setupVideosIn(document);

    // Setup Javascript events for videos added by updater
    if (window.MutationObserver) {
        var observer = new MutationObserver(function(mutations) {
            for (var i = 0; i < mutations.length; i++) {
                var additions = mutations[i].addedNodes;
                if (additions == null) continue;
                for (var j = 0; j < additions.length; j++) {
                    var node = additions[j];
                    if (node.nodeType == 1) {
                        setupVideosIn(node);
                    }
                }
            }
        });
        observer.observe(document.body, {childList: true, subtree: true});
    }
});

/*
 * show-op
 * https://github.com/savetheinternet/Tinyboard/blob/master/js/show-op.js
 *
 * Adds "(OP)" to >>X links when the OP is quoted.
 *
 * Released under the MIT license
 * Copyright (c) 2012 Michael Save <savetheinternet@tinyboard.org>
 * Copyright (c) 2014 Marcin Łabanowski <marcin@6irc.net>
 *
 * Usage:
 *   $config['additional_javascript'][] = 'js/jquery.min.js';
 *   $config['additional_javascript'][] = 'js/show-op.js';
 *
 */

$(document).ready(function(){
	var showOPLinks = function() {
		var OP;
		
		if ($('div.banner').length == 0) {
			OP = parseInt($(this).parent().find('div.post.op a.post_no:eq(1)').text());
		} else {
			OP = parseInt($('div.post.op a.post_no:eq(1)').text());
		}
		
		$(this).find('div.body a:not([rel="nofollow"])').each(function() {
			var postID;
			
			if(postID = $(this).text().match(/^>>(\d+)$/))
				postID = postID[1];
			else
				return;
			
			if (postID == OP) {
				$(this).after(' <small>(OP)</small>');
			}
		});
	};
	
	$('div.post.reply').each(showOPLinks);
	
	// allow to work with auto-reload.js, etc.
	$(document).on('new_post', function(e, post) {
		if ($(post).is('div.post.reply')) {
			$(post).each(showOPLinks);
		}
		else {
			$(post).find('div.post.reply').each(showOPLinks);
		}
	});
});

/*
 * inline-expanding.js
 * https://github.com/savetheinternet/Tinyboard/blob/master/js/inline-expanding.js
 *
 * Released under the MIT license
 * Copyright (c) 2012-2013 Michael Save <savetheinternet@tinyboard.org>
 * Copyright (c) 2013-2014 Marcin Łabanowski <marcin@6irc.net>
 *
 * Usage:
 *   // $config['additional_javascript'][] = 'js/jquery.min.js';
 *   $config['additional_javascript'][] = 'js/inline-expanding.js';
 *
 */

onready(function(){
	var inline_expand_post = function() {
		var link = this.getElementsByTagName('a');

		for (var i = 0; i < link.length; i++) {
			if (typeof link[i] == "object" && link[i].childNodes && typeof link[i].childNodes[0] !== 'undefined' && link[i].childNodes[0].src && link[i].childNodes[0].className.match(/post-image/) && !link[i].className.match(/file/)) {
				link[i].childNodes[0].style.maxWidth = '98%';
				link[i].onclick = function(e) {
					if (this.childNodes[0].className == 'hidden')
						return false;
					if (e.which == 2 || e.metaKey)
						return true;
					if (!this.dataset.src) {
						this.parentNode.removeAttribute('style');
						this.dataset.expanded = 'true';

						if (this.childNodes[0].tagName === 'CANVAS') {
							this.removeChild(this.childNodes[0]);
							this.childNodes[0].style.display = 'block';
						}

						this.dataset.src= this.childNodes[0].src;
						this.dataset.width = this.childNodes[0].style.width;
						this.dataset.height = this.childNodes[0].style.height;
						

						this.childNodes[0].src = this.href;
						this.childNodes[0].style.width = 'auto';
						this.childNodes[0].style.height = 'auto';
						this.childNodes[0].style.opacity = '0.4';
						this.childNodes[0].style.filter = 'alpha(opacity=40)';
						this.childNodes[0].onload = function() {
							this.style.opacity = '';
							delete this.style.filter;
						}
					} else {
						if (~this.parentNode.className.indexOf('multifile'))
							this.parentNode.style.width = (parseInt(this.dataset.width)+40)+'px';
						this.childNodes[0].src = this.dataset.src;
						this.childNodes[0].style.width = this.dataset.width;
						this.childNodes[0].style.height = this.dataset.height;
						delete this.dataset.expanded;
						delete this.dataset.src;
						delete this.childNodes[0].style.opacity;
						delete this.childNodes[0].style.filter;

						if (localStorage.no_animated_gif === 'true' && typeof unanimate_gif === 'function') {
							unanimate_gif(this.childNodes[0]);
						}
					}
					return false;
				}
			}
		}
	}

	if (window.jQuery) {
		$('div[id^="thread_"]').each(inline_expand_post);

		// allow to work with auto-reload.js, etc.
		$(document).on('new_post', function(e, post) {
			inline_expand_post.call(post);
		});
	} else {
		inline_expand_post.call(document);
	}
});
