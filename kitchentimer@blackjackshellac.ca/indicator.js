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

const KitchenTimerIndicator = GObject.registerClass(
class KitchenTimerIndicator extends PanelMenu.Button {
    _init() {
        this._settings = new Settings();
        this._timers = Timers.attach(this);
        this._logger = new Logger('kt indicator', this._settings.debug);
        this.logger.info('Initializing extension');

        super._init(0.0, _('Kitchen Timer'));

        this._fullIcon = Gio.icon_new_for_string(Me.path+'/icons/kitchen-timer-blackjackshellac-full.svg');

        this._progressIcons = [];
        this._progressIconsDegrees = {};

        for (var deg = 0; deg <= 345; deg += 15) {
          // load icon as a gicon and store in the hash
          var icon_name="/icons/kitchen-timer-"+deg+".svg";
          var gicon = Gio.icon_new_for_string(Me.path+icon_name);
          this._progressIconsDegrees[deg] = gicon;
          this.logger.debug(`Loaded progress icon ${icon_name} for ${deg} degrees`);
        }

        var icon = new St.Icon({
          gicon: this._progressIconsDegrees[0],
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

        this._pmbuilder = new Menus.PanelMenuBuilder(this.menu, this);
        this._pmbuilder.build();

        this.connect('destroy', () => {
          this.logger.debug("Panel indicator button being destroyed");
          this._panel_label = undefined;
          this._box = undefined;
          Timers.detach();
        });
    }

    get gicon() {
      return this._fullIcon;
    }

    progress_gicon(degrees) {
      var icon = this._progressIconsDegrees[degrees];
      if (icon === undefined) {
        this.logger.error(`Failed to get icon for degrees=${degrees}`);
        icon=this._progressIconsDegrees[0];
      }
      return icon;
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

    rebuild_menu() {
      this._pmbuilder.build();
    }
});


