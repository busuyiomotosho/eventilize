#!/bin/sh
# Toggle Babel config for Next.js (disable for dev/build, enable for test)

if [ "$1" = "enable" ]; then
  if [ -f .babelrc.disabled ]; then
    mv .babelrc.disabled .babelrc
    echo "Babel config enabled (.babelrc restored)"
  else
    echo ".babelrc.disabled not found."
  fi
elif [ "$1" = "disable" ]; then
  if [ -f .babelrc ]; then
    mv .babelrc .babelrc.disabled
    echo "Babel config disabled (.babelrc moved to .babelrc.disabled)"
  else
    echo ".babelrc not found."
  fi
else
  echo "Usage: ./toggle-babel.sh [enable|disable]"
fi
