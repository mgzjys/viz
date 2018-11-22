#!/bin/bash
# VSP deploy script for travis CI
# add ssh fingerprint to local know_hosts file
'[[ -f /.dockerenv ]] && mkdir -p ~/.ssh && echo "viz-dev.vsp.tu-berlin.de ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDK8n2ZALryd/+JrtQtghFlAw/ETTjZk/CsxoqN7ZPSYqqmD2kDxqNv01VhU9ckBkjHAhwNmWe9l50AWpBW6X+yIp3W9Jo+2hWoo4CNksaoZkB6fE0fzXb4CivvTa7Zb5wGBz+Haidzr1tNnqKobxkfxmfrMHD4NxoK2+t56unPOuTxOGWxU/5JQGLWa5qSiSWrC62m7kIj3i+Z2twUP1vbefRLMRvkmRygGdarDcxuHalVH8hYeX5aynia2yPplfFZvkE5pEEWnkq/LompinevufCh+0xD80QBTUC5QnTrm21OlglZomGy7gI+7VZm1QVqFgkp6Zyq6J/Ke2ISi1xr" > ~/.ssh/known_hosts'
'[[ -f /.dockerenv ]] && mkdir -p ~/.ssh && echo "viz.vsp.tu-berlin.de ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDK8n2ZALryd/+JrtQtghFlAw/ETTjZk/CsxoqN7ZPSYqqmD2kDxqNv01VhU9ckBkjHAhwNmWe9l50AWpBW6X+yIp3W9Jo+2hWoo4CNksaoZkB6fE0fzXb4CivvTa7Zb5wGBz+Haidzr1tNnqKobxkfxmfrMHD4NxoK2+t56unPOuTxOGWxU/5JQGLWa5qSiSWrC62m7kIj3i+Z2twUP1vbefRLMRvkmRygGdarDcxuHalVH8hYeX5aynia2yPplfFZvkE5pEEWnkq/LompinevufCh+0xD80QBTUC5QnTrm21OlglZomGy7gI+7VZm1QVqFgkp6Zyq6J/Ke2ISi1xr" >> ~/.ssh/known_hosts'
# find location of decrypted VSP_SSH_KEY
find / -type f -name VSP_SSH_KEY 2> >(grep -v 'Permission denied' >&2) |sed 's/.\{12\}$//' > tmp_keylocation
# read location into var
LOCATION=$(cat tmp_keylocation)
# set correct permissions
chmod 0600 $LOCATION
# remove old webfiles
ssh -i $LOCATION/VSP_SSH_KEY vizdeploy@viz.vsp.tu-berlin.de 'sudo rm -r /var/www/viz-dev/*'
# upload fresh built files
scp -i $LOCATION/VSP_SSH_KEY ./dist vizdeploy@viz.vsp.tu-berlin.de:/var/www/viz-dev