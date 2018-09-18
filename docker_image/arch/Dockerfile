FROM base/archlinux

RUN pacman -Syu --noconfirm && \
  pacman --noconfirm -S openssh wget curl git

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile
RUN ssh-keygen -A
RUN mkdir -p /root/.ssh; chmod 700 /root/.ssh
RUN mkdir /var/run/sshd

RUN echo en_US.UTF-8 UTF-8 >> /etc/locale.gen && echo ja_JP.UTF-8 UTF-8 >> /etc/locale.gen && locale-gen && echo LANG=ja_JP.UTF-8 > /etc/locale.conf

ADD ./issue.net /etc/
ADD ./sshd_config /etc/ssh/

CMD ["/usr/sbin/sshd", "-D"]
