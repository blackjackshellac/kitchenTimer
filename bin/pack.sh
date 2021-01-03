#!/bin/bash

ed=kitchentimer@blackjackshellac.ca
[ ! -d $ed ] && echo "Extension dir $ed not found" && exit 1
cd $ed

#kitchen-timer-blackjackshellac
extra_source=$(ls -1 *.js | grep -v prefs.js | grep -v extension.js)
extra_source="$extra_source $(ls *.ogg *.ui)"
extra_source="$extra_source"
echo $extra_source
eso=""
for es in $extra_source; do
	echo "Adding extra $es"
	eso="$eso --extra-source=$es"
done

eso="$eso --extra-source=./icons/ --extra-source=./bin/"

cmd="gnome-extensions pack --podir=po/ --schema=schemas/org.gnome.shell.extensions.kitchen-timer-blackjackshellac.gschema.xml --gettext-domain=kitchen-timer-blackjackshellac $eso -o ../ --force"
echo $cmd
$cmd
