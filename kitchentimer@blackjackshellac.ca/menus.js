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

class PanelMenuBuilder {
  constructor(menu, settings, timers) {
    log("");
    this._menu = menu;
    this._settings = settings;
    this._timers = timers;
  }

  build() {

    // this._addSwitch(_("Run Timer")).connect("toggled", () => {
      // this._stopTimer = !(this._stopTimer);
      // this.remove_actor(this._logo);
      // this.add_actor(this._box);
    //   this._refresh_timer();
    // });

    this._create_timer_menu = this._addSubMenu(_("Create Timer"), this._menu);
    this._buildCreateTimerMenu();

    this._addSeparator();

    this._timers.sorted().forEach(timer => {
      var timer_item = this._addItem(`${timer.name} (${timer.duration} secs)`);
      timer_item._timer = timer;
      timer_item.connect('activate', (ti) => {
        ti._timer.start();
      });
    });
  }

  _secondsToHMS(secs) {
    secs = Number(secs);
    var shms={
      secs: secs,
      hours: Math.floor(secs / 3600),
      minutes: Math.floor(secs % 3600 / 60),
      seconds: Math.floor(secs % 3600 % 60)
    };
    return shms;
  }

	// Add sliders SubMenu to manually set the timer
	_buildCreateTimerMenu() {

    this._hms = this._secondsToHMS(this._settings.default_timer);

		this._hoursLabel = new St.Label({ text: this._hms.hours.toString() + "h" });
		this._minutesLabel = new St.Label({ text: this._hms.minutes.toString() + "m" });
		this._secondsLabel = new St.Label({ text: this._hms.seconds.toString() + "s" });

		// Hours
		let item = new PopupMenu.PopupMenuItem(_("Hours"), { reactive: false });

		let bin = new St.Bin({ x_expand: true, x_align: St.Align.END });
		bin.child = this._hoursLabel;
		item.add(bin);

		this._create_timer_menu.menu.addMenuItem(item);

		item = new PopupMenu.PopupBaseMenuItem({ activate: false });
		this._hoursSlider = new Slider.Slider(0, {x_expand: true, y_expand:true});
		this._hoursSlider._value = this._hms.hours / 23;
		this._hoursSlider.connect('notify::value', () => {
			this._hms.hours = Math.ceil(this._hoursSlider._value*23);
			this._hoursLabel.set_text(this._hms.hours.toString() + "h");
			this._time = this._hms.hours*3600 + this._hms.minutes*60 + this._hms.seconds;
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
		this._minutesSlider._value = this._hms.minutes / 59;
		this._minutesSlider.connect('notify::value', () => {
			this._hms.minutes = Math.ceil(this._minutesSlider._value*59);
			this._minutesLabel.set_text(this._hms.minutes.toString() + "m");
			this._time = this._hms.hours*3600 + this._hms.minutes*60 + this._hms.seconds;
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
		this._secondsSlider._value = this._hms.seconds / 59;
		this._secondsSlider.connect('notify::value', () => {
			this._hms.seconds = Math.ceil(this._secondsSlider._value*59);
			this._secondsLabel.set_text(this._hms.seconds.toString() + "s");
			this._time = this._hms.hours*3600 + this._hms.minutes*60 + this._hms.seconds;
		});
		item.add(this._secondsSlider);
		this._create_timer_menu.menu.addMenuItem(item);

		item = new PopupMenu.PopupMenuItem(_("Name"), { reactive: false } );
		this._create_timer_menu.menu.addMenuItem(item);

    this._name_entry = new St.Entry();
    item = new PopupMenu.PopupMenuItem("", { reactive: false } );
    bin = new St.Bin({ x_expand: true, x_align: St.Align.START });
    bin.child = this._name_entry;
    item.add(bin);
		this._create_timer_menu.menu.addMenuItem(item);

		this._addSwitch(_("Create"), false, this._create_timer_menu.menu).connect('toggled', (create_switch) => {
		  Main.notify(_('Run or stop timer'));
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
    log("adding text="+text);
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
    log("_reset_timer");
  }

  _run_timer() {
    log("_run_timer");
  }

}
