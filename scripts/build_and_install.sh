#!/bin/bash

GIT_REPO=$HOME/homepage.git
WORKING_DIRECTORY=$HOME/homepage-working
PUBLIC_WWW=$HOME/html
BACKUP_WWW=$HOME/backup_html
MY_DOMAIN=jhbruhn.de

set -e

rm -rf $WORKING_DIRECTORY
mkdir -p $WORKING_DIRECTORY
mkdir -p $PUBLIC_WWW/

rsync -aqz $PUBLIC_WWW/ $BACKUP_WWW
trap "echo 'An issue has been occurred.  Reverting to backup.'; rsync -aqz --del $BACKUP_WWW/ $PUBLIC_WWW; rm -rf $WORKING_DIRECTORY" EXIT

git clone $GIT_REPO $WORKING_DIRECTORY
rm -rf $PUBLIC_WWW/*
~/bin/hugo -s $WORKING_DIRECTORY -d $PUBLIC_WWW -b "https://${MY_DOMAIN}"
rm -rf $WORKING_DIRECTORY
trap - EXIT
