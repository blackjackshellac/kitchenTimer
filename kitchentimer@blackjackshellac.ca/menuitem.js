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

const { Clutter, GObject, St, Gio } = imports.gi;

const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Timer = Me.imports.timers.Timer;
const Utils = Me.imports.utils;
const HMS = Me.imports.hms.HMS;
const Logger = Me.imports.logger.Logger;

var KTTypes = {
  "stop": 'media-playback-stop-symbolic',
  "delete" : 'edit-delete-symbolic'
}

var KitchenTimerMenuItem = GObject.registerClass(
class KitchenTimerMenuItem extends PopupMenu.PopupMenuItem {
  _init(timer, menu) {
      super._init("", { reactive: true });

      this._timer = timer;
      this.logger = new Logger('kt menuitem', timer.timers.settings.debug);

      var box = new St.BoxLayout({
        x_expand: true,
        x_align: St.Align.START,
        pack_start: true,
        style_class: 'kitchentimer-menu-box'
      });
      this.add(box);

      var hms = new HMS(timer.duration);

      var name = new St.Label({
        style_class: 'kitchentimer-menu-name',
        x_expand: true,
        x_align: St.Align.START
      });
      name.set_text(timer.name);

      timer.label = new St.Label({
        style_class: 'kitchentimer-menu-label',
        x_expand: false,
        x_align: St.Align.END
      });

      var key = timer.degree_progress(15 /* 15 degree increments */);
      var timer_icon = new St.Icon({
        x_align: St.Align.END,
        x_expand: false,
        gicon: timer.timers.indicator.progress_gicon(key),
        style_class: 'kitchentimer-menu-icon'
      });
      timer_icon.set_icon_size(20);

      var control_button;
      if (timer.is_running()) {
        control_button = new KitchenTimerControlButton(timer, "stop");
        control_button.connect('clicked', (cb) => {
          cb.stop();
          menu.close();
        });
      } else if (timer.quick) {
        control_button = new KitchenTimerControlButton(timer, "delete");
        control_button.connect('clicked', (cb) => {
          cb.delete();
          menu.close();
        });

      }

      // if (timer.is_running()) {
      //   timer_icon.connect('button-press-event', (timer) => {
          //timer.reset();
      //   });
      // }

      if (control_button) {
        this.logger.debug("Adding control icon button");
        box.add_child(control_button);
      }

      box.add_child(timer.label);
      box.add_child(timer_icon);
      box.add_child(name);

      this.connect('activate', (tmi) => {
        if (!tmi._timer.is_running()) {
          tmi._timer.start();
        }
      });

      timer.label_progress(hms);

      menu.addMenuItem(this);
  }

  get timer() {
    return this._timer;
  }

  static parseTimerEntry(entry, quick) {
    if (entry.length === 0) {
      return undefined;
    }

    var name="";
    var hours = 0;
    var minutes = 0;
    var seconds = 0;

    //var re = /(?<name>[a-zA-Z][^\d]+?)?\s?(?<t1>\d+)\s*:?\s*(?<t2>[\d]+)?\s*:?\s*(?<t3>\d+)?$/;
    var re = /(?<name>[^\s]+\s)?(?<t1>\d+)\s*:?\s*(?<t2>[\d]+)?\s*:?\s*(?<t3>\d+)?$/;
    var m=re.exec(entry);
    if (m) {
      var g=m.groups;
      if (g.name) {
        name=g.name;
      }
      if (g.t3 && g.t2 && g.t1) {
        hours=g.t1;
        minutes=g.t2;
        seconds=g.t3;
      } else if (g.t2 && g.t1) {
        minutes=g.t1;
        seconds=g.t2;
      } else if (g.t1) {
        seconds=g.t1;
      }
    }

    var hms = HMS.create(hours, minutes, seconds);
    return {
      name: name,
      hms: hms,
      quick: quick
    };
  }
});

var KitchenTimerQuickItem = GObject.registerClass(
class KitchenTimerQuickItem extends PopupMenu.PopupMenuItem {
  _init(menu, timers) {
    super._init(_("Quick"), { reactive: false });

    this._menu = menu;
    this._timers = timers;

    menu.addMenuItem(this);

    this.logger = new Logger('kt menuitem', timers.settings.debug);

    var layout = new St.BoxLayout({
      style_class: 'kitchentimer-quick-menu',
      x_expand: true
    });

    this.add(layout);

    this._entry = new St.Entry( {
      x_expand: true,
      x_align: St.Align.START,
      y_align: Clutter.ActorAlign.CENTER
    });
    this._entry.set_hint_text(_("Name 00:00:00"));
    this._entry.get_clutter_text().set_activatable(true);

    this._gogo = new PopupMenu.PopupSwitchMenuItem(_("Go"), false, {
      hover: false,
      style_class: null
    });

    layout.add_child(this._entry);
    layout.add_child(this._gogo);

    this._entry.get_clutter_text().connect('activate', (e) => {
      var entry = e.get_text();
      this.logger.debug('activate: '+entry);
      var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
      if (result) {
        this._entry.get_clutter_text().set_text("%s %s".format(result.name, result.hms.toString()));
        var timer = this._addTimerStart(result);
        if (timer === undefined) {
          this._gogo.setToggledState(false);
        } else {
          this._menu.close();
        }
      }
    });

    this._entry.get_clutter_text().connect('key-focus-out', (e) => {
      var entry = e.get_text();
      this.logger.debug('key out hours: '+entry);
      var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
      if (result) {
        this._entry.get_clutter_text().set_text("%s %s".format(result.name, result.hms.toString()));
      }
    });

    this._gogo.connect('toggled', (go) => {
      if (go.state) {
        var entry = this._entry.get_clutter_text().get_text().trim();

        var result = KitchenTimerMenuItem.parseTimerEntry(entry, true);
        if (!result) {
          this.logger.error("Invalid timer entry='%s'", entry);
          go.setToggleState(false);
          return;
        }

        var timer = this._addTimerStart(result);
        if (timer === undefined) {
          go.setToggledState(false);
        } else {
          this._menu.close();
        }
      }
    });
  }

  _addTimerStart(result) {
    var timer = new Timer(result.name, result.hms.toSeconds());
    timer.quick = result.quick;
    var tt = this._timers.add_check_dupes(timer);
    if (tt !== undefined) {
      tt.start();
    }
    return tt;
  }

});

var KitchenTimerControlButton = GObject.registerClass(
class KitchenTimerControlButton extends St.Button {
    _init(timer, type) {
        super._init();

        // 'media-playback-stop-symbolic'
        // 'edit-delete-symbolic'
        var icon = new St.Icon({
            icon_name: KTTypes[type],
            style_class: 'kitchentimer-menu-delete-icon'
        });
        icon.set_icon_size(20);

        this.child = icon;

        this._timer = timer;
    }

    delete() {
      this._timer.delete();
    }

    get icon() {
      return this.child;
    }

    stop() {
      this._timer.stop();
    }
});

