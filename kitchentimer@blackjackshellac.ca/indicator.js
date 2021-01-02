/*
 * Kitchen Timer: Gnome Shell Kitchen Timer Extension
 * Copyright (C) 2021 Steeve McCauley
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';
const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const { GObject, St, Clutter, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Utils = Me.imports.utils;
const Settings = Me.imports.settings.Settings;
const Menus = Me.imports.menus;
const Timers = Me.imports.timers.Timers;
const Timer = Me.imports.timers.Timer;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const progressIconFiles = [
  'kitchen-timer-0',  // 0, 180
  'kitchen-timer-15',    // 15, 195
  'kitchen-timer-30',    // 30, 210
  'kitchen-timer-45',
  'kitchen-timer-60',
  'kitchen-timer-75',
  'kitchen-timer-90',
  'kitchen-timer-105',
  'kitchen-timer-120',
  'kitchen-timer-135',
  'kitchen-timer-150',
  'kitchen-timer-165'
];

const KitchenTimerIndicator = GObject.registerClass(
class KitchenTimerIndicator extends PanelMenu.Button {
    _init() {
        this._settings = new Settings();
        this._timers = Timers.attach(this);
        this._logger = new Utils.Logger('kitchen_timer', this._settings.debug);
        this.logger.info('Initializing extension');

        super._init(0.0, _('Kitchen Timer'));

        this._progressIcons = [];
        this._progressIconsDegrees = {};

        var deg = 0;
        progressIconFiles.forEach( (icon_name) => {
          // load icon as a gicon and store in the hash
          var gicon = Gio.icon_new_for_string(Me.path+"/icons/"+icon_name+".svg");
          this._progressIconsDegrees[deg] = gicon;
          this._progressIconsDegrees[deg+180] = gicon;
          this.logger.debug(`Loaded progress icon ${icon_name} for ${deg} and ${deg+180} degrees`);
          deg += 15;
        });

        var icon = new St.Icon({
          gicon: this._progressIconsDegrees[0],
          style_class: 'system-status-icon'
        });

        this._box = new St.BoxLayout({ name: 'panelStatusMenu' });
        this._box.add_child(icon);
        this._box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));

        this._panel_label=new St.Label({ text: "",
          x_align: Clutter.ActorAlign.END,
          y_align: Clutter.ActorAlign.CENTER,
          y_expand: false
        });

      //   this._pie = new St.DrawingArea({
      //     y_align: Clutter.ActorAlign.CENTER,
      //     y_expand: true
      //   });

      //   this._pie.set_width(30);
      //   this._pie.set_height(25);
      //   this._pie.connect('repaint', () => {
          //log('repaint request');
      //     this.draw();
      //   });
		    //Lang.bind(this, this._draw));

        //this._box.add(this._pie);
        this._box.add(this._panel_label);

        this.add_child(this._box);

        this._pmbuilder = new Menus.PanelMenuBuilder(this.menu, this);
        this._pmbuilder.build();
    }

    progress_gicon(degrees) {
      var icon = this._progressIconsDegrees[degrees];
      if (icon === undefined) {
        this.logger.error(`Failed to get icon for degrees=${degrees}`);
        icon=this._progressIconsDegrees[0];
      }
      return icon;
    }

	  arc(r, remaining, duration, angle, lightColor, darkColor) {
		  if(duration == 0) return;
		  var pi = Math.PI;
		  var cairo_context = this._pie.get_context();
		  var ok;
		  var light;
		  var dark;

		  [ok, light] = Clutter.Color.from_string(lightColor);

		  //log(`ok=${ok} cairo_context=${cairo_context} light=${light}`);

		  [ok, dark] = Clutter.Color.from_string(darkColor);

      //log(`ok=${ok} cairo_context=${cairo_context} dark=${dark}`);


		  Clutter.cairo_set_source_color(cairo_context, light);

	    var [width, height] = this._pie.get_surface_size();

		  var xc = width / 2;
		  var yc = height / 2;

		  cairo_context.arc(xc, yc, r, 0, 2*pi);
		  cairo_context.fill();

		  Clutter.cairo_set_source_color(cairo_context, dark);
		  var new_angle = angle + (remaining * 2 * pi / duration);
		  cairo_context.setLineWidth(1.3);
		  cairo_context.arc(xc, yc, r, angle, new_angle);
		  cairo_context.lineTo(xc,yc);
		  cairo_context.closePath();
		  cairo_context.fill();
	  }

	  draw() {
	    var timer=this._timers._active_timer;
	    if (timer === undefined) {
	      return;
	    }

	    //log(`ignoring pie draw for ${timer.name}`);
	    var now = Date.now();
	    var remaining = Math.ceil((timer.end-now) / 1000);
		  var pi = Math.PI;
		  /*
		   * let background = new Clutter.Color();
		   * background.from_string('#0000ffff');
		   * Clutter.cairo_set_source_color(cairo_context, background); cairo_context.rectangle(0, 0,
		   * width, height); cairo_context.fill();
		   */

      return;
      // TODO this crashes
		  //this.arc(8, remaining, timer.duration, -pi/2, this._settings.pie_colour_light, this._settings.pie_colour_dark);
	  }

	  get settings() {
	    return this._settings;
	  }

	  get timers() {
	    return this._timers;
	  }

	  get logger() {
	    return this._logger;
	  }

});


