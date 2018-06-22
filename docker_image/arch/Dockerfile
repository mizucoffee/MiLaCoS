FROM base/archlinux

RUN pacman -Syu --noconfirm && \
  pacman --noconfirm -S openssh wget curl git

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile
RUN ssh-keygen -A
RUN mkdir -p /root/.ssh; chmod 700 /root/.ssh
RUN mkdir /var/run/sshd

ADD ./issue.net /etc/
ADD ./sshd_config /etc/ssh/

CMD ["/usr/sbin/sshd", "-D"]
