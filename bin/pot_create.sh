#!/bin/bash

ME=$(basename $0)
MD=$(cd $(dirname $0); pwd)

echo $MD
cd $MD/../kitchentimer@blackjackshellac.ca
[ $? -ne 0 ] && echo "Failed to change to extension directory" && exit 1

pot='po/kitchen-timer-blackjackshellac.pot'
opts="--from-code=UTF-8 -F -j --output=$pot"
opts="$opts --copyright-holder='Copyright (C) 2021, Steeve McCauley'"
#--foreign-user
#omit FSF copyright in output for foreign user
opts="$opts --package-name=''kitchen-timer-blackjackshellac"
#opts="$opts --package-version='5'"
files="*.js *.ui schemas/*.xml"

cmd="xgettext $opts $files $pot"
echo $cmd
$cmd
