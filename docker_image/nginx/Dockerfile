FROM nginx

MAINTAINER mizucoffee

RUN apt update
RUN apt -y install git

ADD nginx.conf /etc/nginx/
ADD conf.d /etc/nginx/conf.d/

CMD ["nginx", "-g", "daemon off;"]
