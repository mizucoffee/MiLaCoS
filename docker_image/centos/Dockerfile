FROM centos

ENV TERM xterm

RUN yum update && yum install -y openssh-server nano vim wget curl

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile
RUN ssh-keygen -A
RUN mkdir -p /root/.ssh; chmod 700 /root/.ssh
RUN mkdir /var/run/sshd

ADD ./issue.net /etc/
ADD ./sshd_config /etc/ssh/

CMD ["/usr/sbin/sshd", "-D"]
