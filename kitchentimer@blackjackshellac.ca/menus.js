
const PopupMenu = imports.ui.popupMenu;
const Main = imports.ui.main;

class PanelMenuBuilder {
  constructor(menu) {
    log("");
    this._menu = menu;

    // let item = new PopupMenu.PopupMenuItem(_('Show Notification'));
    // item.connect('activate', () => {
    //   Main.notify(_('Whatʼs up, folks?'));
    // });
    // this._menu.addMenuItem(item);
  }

  build() {
    this._additem(_('Show Notification')).connect('activate', () => {
      Main.notify(_('Notification test'))
    });

    this._additem(_('Reset timer …')).connect('activate', () => {
      this._reset_timer();
    });
  }

  _additem(text) {
    log("adding text="+text);
    let item = new PopupMenu.PopupMenuItem(text)
    this._menu.addMenuItem(item);
    return item;
  }

  _reset_timer() {
    log("_reset_timer");
  }

}
