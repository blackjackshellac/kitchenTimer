#!/bin/bash
#
# Kitchen Timer: General purpose timer extension for Gnome Shell
# Copyright (C) 2021 Steeve McCauley
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

ME=$(basename $0)
MD=$(dirname $0)
ED=kitchentimer@blackjackshellac.ca
USR_SHARE=~/.local/share
ICONS=$USR_SHARE/icons/hicolor
EXTENSIONS=$USR_SHARE/gnome-shell/extensions
SCHEMAS=schemas
DST="$EXTENSIONS/$ED"

puts() {
	echo -e $*
}

log() {
	puts $*
}

info() {
	log "INFO" $*
}

warn() {
	log "WARN" $*
}

die() {
	log "FATAL" $*
	exit 1
}

run() {
	info $*
	$*
	[ $? -ne 0 ] && die "Run command failed: $*"
}

help() {
cat << HELP
Installer for $ED

$ ./$ME [options]

  -i : install (default)
  -u : uninstall
  -s : show current installation type
  -d : debug install (symlink to source)
  -h : help (this)

HELP
	exit 0
}

declare -i DEBUG=${KITCHENTIMER_DEBUG:=0}

while getopts ":iusdh" opt; do
	case $opt in
		d)
			DEBUG=1
			;;
		s)
			if [ -L "$DST" ]; then
				info "Debug installation: $DST"
				info " symlink to $(readlink -f $DST)"
			elif [ -d "$DST" ]; then
				info "Normal installation: $DST"
				ls -ld "$DST"
			elif [ -e "$DST" ]; then
				ls -l $DST
				die "Invalid destination exists: $DST"
			else
				info "Not installed"
			fi
			exit 0
			;;
		i)
			info "Install - default"
			;;
		u)
			info "Uninstall $DST"
			if [ -L "$DST" ]; then
				info "Removing symlink"
				run rm -f "$DST"
			elif [ -d "$DST" ]; then
				info "Deleting installation"
				cd "$DST"
				[ $? -ne 0 ] && die "failed to change to destination $DST"
				cd "$EXTENSIONS"
				if [ -d "$ED" ]; then
				  run rm -rf "$ED"
				  res=$?
				  [ $res -ne 0 ] && die "Failed to delete $DST [$res]"
				fi
			elif [ -e "$DST" ]; then
				die "Invalid destination exists: $DST"
			else
				warn "Not installed"
			fi
			exit 0
			;;
		h)
			help
			;;
		*)
			die "Unknown option $opt"
			;;
	esac
done

[ $DEBUG -ne 0 ] && warn "DEBUG is enabled"

run cd $MD

if [ $DEBUG -ne 0 ]; then
	run ./bin/pot_create.sh
fi

run cd $ED

#run mkdir -p $SCHEMAS
#run cp -puv schemas/*.xml $SCHEMAS/
run glib-compile-schemas --strict $SCHEMAS

ldir="$(pwd)"

[ ! -d "$EXTENSIONS" ] && run mkdir -p $EXTENSIONS

if [ $DEBUG -ne 0 ]; then
  warn "DEBUG is enabled"
  info "Creating symlink to $ldir"
  run cd $EXTENSIONS
  [ ! -L "$ED" ] && run rm -rfv $ED
  run ln -sf $ldir .
else
  info "Installing extension in $EXTENSIONS/$ED"
  [ -L "$EXTENSIONS/$ED" ] && rm -v $EXTENSIONS/$ED
  run rsync -av . $EXTENSIONS/$ED
fi
run cd $EXTENSIONS/$ED
pwd

info "Alt-F2 'r' to restart gnome shell"

