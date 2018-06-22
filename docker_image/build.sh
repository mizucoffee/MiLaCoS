#!/bin/bash

docker build ./ubuntu -t ssh_ubuntu
docker build ./centos -t ssh_centos
docker build ./debian -t ssh_debian
docker build ./arch -t ssh_arch
