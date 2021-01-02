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

const St = imports.gi.St;

const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;
const Slider = imports.ui.slider;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Timer = Me.imports.timers.Timer;
const Utils = Me.imports.utils;
const Logger = Utils.Logger;

class PanelMenuBuilder {
  constructor(menu, indicator) {
    log("");
    this._menu = menu;
    this._indicator = indicator;
    this._create_timer_menu = undefined;
    this._settings = indicator.settings;
    this._timers = indicator.timers;

    this.logger = new Logger('kt menu', indicator.settings.debug);

    this._menu.connect('open-state-changed', (self,open) => {
      if (open) {
        this.build();
      } else {
        this.timers.forEach( (timer) => {
          timer.label = null;
        });
      }
    });
  }

  get timers() {
    return this._indicator.timers;
  }

  create_icon() {
    var icon = new St.Icon({
            icon_name: 'kitchen-timer-blackjackshellac-symbolic',
            style_class: 'system-status-icon',
        });
    icon.set_icon_size(16);
    return icon;
  }

  build() {
    this.logger.info("Building the popup menu");

    this._menu.removeAll();
    this.timers.refresh();

    // this._addSwitch(_("Run Timer")).connect("toggled", () => {
      // this._stopTimer = !(this._stopTimer);
      // this.remove_actor(this._logo);
      // this.add_actor(this._box);
    //   this._refresh_timer();
    // });

    this._create_timer_menu = this._addSubMenu(_("Create Timer"), this._menu);
    this._buildCreateTimerMenu();

    this._addSeparator();

    this.timers.sorted().forEach( (timer) => {
      var hms = new Utils.HMS(timer.duration);

      var timer_item = this._addItem(timer.name);
      timer_item._timer = timer;
      timer.label = new St.Label({ x_expand: true, x_align: St.Align.START });
      timer.label_progress(hms);

      var bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
		  bin.child = timer.label;
		  timer_item.add(bin);

		  //let box = new St.BoxLayout({ x_expand: true, x_align: St.Align.END });
		  //timer.moon = new St.Label( { x_expand: true, x_align: St.Align.END });
		  //box.add_child(timer.label);
		  //box.add_child(timer.moon)
		  //timer_item.add(box);


		  var icon_name = 'document-open-recent-symbolic';
		  if (timer.is_running()) {
		    icon_name = 'appointment-missed-symbolic';
		  }
		  let icon = new St.Icon({
		    icon_name: icon_name,
		    style_class: 'system-status-icon'
		  });
		  icon.set_icon_size(16);
		  if (timer.is_running()) {
		    //https://developer.gnome.org/clutter/stable/ClutterActor.html#ClutterActor.signals
		    icon.connect('button-press-event', (timer) => {
		      timer.reset();
		    });
		  }
		  timer_item.add(icon);
      timer_item.connect('activate', (ti) => {
        ti._timer.start();
      });
    });

    this._addSeparator();
    var prefs = this._addItem(_("Preferences…"));
    prefs.connect('activate', () => {
      ExtensionUtils.openPrefs();
    });
  }

	// Add sliders SubMenu to manually set the timer
	_buildCreateTimerMenu() {

    var hms = new Utils.HMS(this._settings.default_timer);

		this._hoursLabel = new St.Label({ text: hms.hours.toString() + "h" });
		this._minutesLabel = new St.Label({ text: hms.minutes.toString() + "m" });
		this._secondsLabel = new St.Label({ text: hms.seconds.toString() + "s" });

		// Hours
		let item = new PopupMenu.PopupMenuItem(_("Hours"), { reactive: false });

		let bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
		bin.child = this._hoursLabel;
		item.add(bin);

		this._create_timer_menu.menu.addMenuItem(item);

		item = new PopupMenu.PopupBaseMenuItem({ activate: false });
		this._hoursSlider = new Slider.Slider(0, {x_expand: true, y_expand:true});
		this._hoursSlider._value = hms.hours / 23;
		this._hoursSlider.connect('notify::value', () => {
			hms.hours = Math.ceil(this._hoursSlider._value*23);
			this._hoursLabel.set_text(hms.hours.toString() + "h");
			this._time = hms.toSeconds();
		});

		item.add(this._hoursSlider);

		this._create_timer_menu.menu.addMenuItem(item);

		// Minutes
		item = new PopupMenu.PopupMenuItem(_("Minutes"), { reactive: false });
		bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
		bin.child = this._minutesLabel;
		item.add(bin);

		this._create_timer_menu.menu.addMenuItem(item);

		item = new PopupMenu.PopupBaseMenuItem({ activate: false });
		this._minutesSlider = new Slider.Slider(0, { x_expand: true });
		this._minutesSlider._value = hms.minutes / 59;
		this._minutesSlider.connect('notify::value', () => {
			hms.minutes = Math.ceil(this._minutesSlider._value*59);
			this._minutesLabel.set_text(hms.minutes.toString() + "m");
			this._time = hms.toSeconds();
		});
		item.add(this._minutesSlider);
		this._create_timer_menu.menu.addMenuItem(item);

		// Seconds
		item = new PopupMenu.PopupMenuItem(_("Seconds"), { reactive: false });

		bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
		bin.child = this._secondsLabel;
		item.add(bin);
		this._create_timer_menu.menu.addMenuItem(item);

		item = new PopupMenu.PopupBaseMenuItem({ activate: false });
		this._secondsSlider = new Slider.Slider(0, { expand: true });
		this._secondsSlider._value = hms.seconds / 59;
		this._secondsSlider.connect('notify::value', () => {
			hms.seconds = Math.ceil(this._secondsSlider._value*59);
			this._secondsLabel.set_text(hms.seconds.toString() + "s");
			this._time = hms.toSeconds();
		});
		item.add(this._secondsSlider);
		this._create_timer_menu.menu.addMenuItem(item);

		item = new PopupMenu.PopupMenuItem(_("Name"), { reactive: false } );
		this._create_timer_menu.menu.addMenuItem(item);

    this._name_entry = new St.Entry();
    this._name_entry.hint_text = _('Name for timer');
    this._name_entry.set_primary_icon(this.create_icon());
    item = new PopupMenu.PopupMenuItem("", { reactive: false } );
    bin = new St.Bin({ x_expand: true, x_align: St.Align.START });
    bin.child = this._name_entry;
    item.add(bin);
		this._create_timer_menu.menu.addMenuItem(item);

		this._addSwitch(_("Create"), false, this._create_timer_menu.menu).connect('toggled', (create_switch) => {
		  var name = this._name_entry.get_text();
		  this._time = hms.toSeconds();
		  var timer = new Timer(name, this._time);
		  this.timers.add(timer);
		});
	}

  _getMenu(menu) {
    return menu === undefined ? this._menu : menu;
  }

  // this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  _addSeparator(menu=undefined) {
    this._getMenu(menu).addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
  }

  _addSubMenu(text, menu=undefined) {
    menu=this._getMenu(menu);
    let popup = new PopupMenu.PopupSubMenuMenuItem(text);
    menu.addMenuItem(popup);
    return popup;
  }

  _addItem(text, menu=undefined) {
    menu=this._getMenu(menu);
    this.logger.info("adding "+text);
    let item = new PopupMenu.PopupMenuItem(text)
    menu.addMenuItem(item);
    return item;
  }

  _addSwitch(text, on=false, menu=undefined) {
    menu=this._getMenu(menu);
    let item = new PopupMenu.PopupSwitchMenuItem(text, on);
    menu.addMenuItem(item);
    return item;
  }

  // TODO figure out how to reset timer
  _reset_timer() {
    this.logger.info("_reset_timer");
  }

  _run_timer() {
    this.logger.info("_run_timer");
  }

}
