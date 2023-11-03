#!/bin/bash

ME=$(basename $0)
MD=$(cd $(dirname $0); pwd)

echo $MD
cd $MD/../kitchentimer@blackjackshellac.ca/po
[ $? -ne 0 ] && echo "Failed to change to extension po directory" && exit 1

echo Working in $(pwd)
lang=$1
po=$lang.po
[ ! -f $po ] && echo Usage is: $0 [fr] && exit 1

echo > messages.po # xgettext needs that file, and we need it empty
find .. -type f -iname '*.js' -o -iname '*.ui' -o -iname '*.xml' | xgettext -j --from-code=UTF-8 -f - # this modifies messages.po
msgmerge -N $po messages.po > $po.new
mv -v $po $po.old
mv -v $po.new $po
rm messages.po

cd ..
echo Working in $(pwd)
msgfmt -v po/$po -o locale/$lang/LC_MESSAGES/kitchen-timer-blackjackshellac.mo

