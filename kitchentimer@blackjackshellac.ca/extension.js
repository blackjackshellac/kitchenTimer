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

/* exported init */

const GETTEXT_DOMAIN = 'kitchen-timer-blackjackshellac';

const { GObject, St, Clutter } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

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

const KitchenTimerIndicator = GObject.registerClass(
class KitchenTimerIndicator extends PanelMenu.Button {
    _init() {
        this._settings = new Settings();
        this._timers = new Timers(this._settings);
        this._logger = new Utils.Logger(this._settings);
        this._logger.info('Initializing extension');

        super._init(0.0, _('Kitchen Timer'));

        this._icon = new St.Icon({
            icon_name: 'kitchen-timer-blackjackshellac-symbolic',
            style_class: 'system-status-icon',
        });

        this._box = new St.BoxLayout({ name: 'panelStatusMenu' });
        this._box.add_child(this._icon);
        this._box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));

        this._panel_label=new St.Label({ text: "",
          y_align: Clutter.ActorAlign.CENTER,
          y_expand: false
        });
        this._pie = new St.DrawingArea({
          y_align: Clutter.ActorAlign.CENTER,
          y_expand: true
        });

        this._pie.set_width(30);
        this._pie.set_height(25);
        this._pie.connect('repaint', () => {
          log('repaint request');
          this.draw();
        });
		    //Lang.bind(this, this._draw));

        this._box.add(this._pie);
        this._box.add(this._panel_label);

        this.add_child(this._box);

        this._timers.box = this._box;
        this._timers.panel_label = this._panel_label;
        this._timers.pie = this._pie;

        this._pmbuilder = new Menus.PanelMenuBuilder(this.menu, this._settings, this._timers);
        this._pmbuilder.build();
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
		  this.arc(8, remaining, timer.duration, -pi/2, this._settings.pie_colour_light, this._settings.pie_colour_dark);
	  }

});

class Extension {
    constructor(uuid) {
      this._uuid = uuid;

      ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
    }

    enable() {
        this._indicator = new KitchenTimerIndicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}

function init(meta) {
  return new Extension(meta.uuid);
}
