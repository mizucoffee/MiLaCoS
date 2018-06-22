FROM debian

RUN apt-get update && apt-get install -y openssh-server nano vim wget curl net-tools

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile
RUN mkdir -p /root/.ssh; chmod 700 /root/.ssh
RUN mkdir /var/run/sshd

ADD ./issue.net /etc/
ADD ./sshd_config /etc/ssh/

CMD ["/usr/sbin/sshd", "-D"]
