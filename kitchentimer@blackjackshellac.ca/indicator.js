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
const Logger = Me.imports.logger.Logger;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

var KitchenTimerIndicator = GObject.registerClass(
class KitchenTimerIndicator extends PanelMenu.Button {
    _init() {
      // settings now lives in Timers singleton
      this._timers = Timers.attach(this);
      this.logger = new Logger('kt indicator', this.settings);
      this.logger.info('Initializing extension');

      super._init(0.0, _('Kitchen Timer'));

      var icon = new St.Icon({
        gicon: this.timers.progress_gicon(0),
        style_class: 'system-status-icon'
      });
      icon.set_icon_size(20);

      this._box = new St.BoxLayout({ name: 'panelStatusMenu',
        style_class: 'kitchentimer-panel-box'
      });
      this._box.add_child(icon);
      //this._box.add_child(PopupMenu.arrowIcon(St.Side.BOTTOM));

      this._panel_label=new St.Label({ text: "",
        x_align: Clutter.ActorAlign.END,
        y_align: Clutter.ActorAlign.CENTER,
        y_expand: false,
        style_class: 'kitchentimer-panel-label'
      });

      this._panel_name=new St.Label({ text: "",
        x_align: Clutter.ActorAlign.END,
        y_align: Clutter.ActorAlign.CENTER,
        y_expand: false,
        style_class: 'kitchentimer-panel-name'
      });

      this._box.add(this._panel_name);
      this._box.add(this._panel_label);

      this.add_child(this._box);

      this._pmbuilder = new Menus.PanelMenuBuilder(this.menu, this._timers);
      this._pmbuilder.build();

      this.connect('destroy', () => {
        this.logger.debug("Panel indicator button being destroyed");
        this._panel_label = undefined;
        this._box = undefined;
        Timers.detach();
      });
    }

	  get settings() {
	    return this.timers.settings;
	  }

	  get timers() {
	    return this._timers;
	  }

    rebuild_menu() {
      this._pmbuilder.build();
    }
});


