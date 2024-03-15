# Link The Web

## 1. About

This is our senior design project in [Koç University](https://www.ku.edu.tr/en/). This project was [Cem](https://www.linkedin.com/in/oktay-cem-kutlar-b12a40209/)'s idea. You can see contributions in commit history. This is the prototip of the project since it would take more time and a bigger team to develop finalized version of the project. At the beggining we did't have much knowledge about AWS and web development. We spent our half of time to learn the tools that we will be using. But still at the end, we got pretty good feedbacks from our lecturers and friends and we got A for this project. The project completed in 3 months.

## 2. The Idea

Everyday, we all search something on internet. It can be about a course or a food recipt or a product that we want to buy, etc. It can be anything. But sometimes we lost in those links and encounter with false information. It would be great if we could see how those links connected with each other or it would be great if we could ask our questions about the links instantly and discuss the link.

So this project aims to create a website that has a dedicated page for each link on the internet. If a user wants to learn more about a link or wants to disscuss the topic in a link, he/she just needs to copy its URL and search on our website. User can see the connections of the link in a node graph and talk with other users. The details will be explained in the _project details_ section.

## 3. Project Details

If a user searches a link on our website and if the link exist in our database, link page will appear. If the link doesn't exist in our database, link page creation page will appear. Here user should type a link description and connect the link with other related links by writing keywords. The most related link will appear on top.

Below, you can see someone had searched a youtube video(which is not in our database currently) about dijkstra algorithm and redirected to link creation page. User adds _algorithm_ and _dijkstra_ as keywords and the links that has those keywords appeared below with their corresponding node graph. Each node represents another link. User will fill the checkboxes to connect the links so that our link will appear on those nodegraph as a node.

![Link page creation page](/screenshots/linkpage_creation.png)

Here is the example of a pre-created link page example. Someone created a link page for phyton documents and people added some comments about it.

![Link page example](/screenshots/linkpage_example.png)

If user clicks **View Node Graph** button, node graph page will appear and user can see other related links about phyton document. This will help people to enlight about a topic.

In node graph page, you can:

- Hover to see link summaries
  ![hover](/screenshots/nodegraph1.png)
- Vote edges  
  ![vote](/screenshots/vote_edge.png)
- Find the shortest path between 2 nodes by right clicking the nodes  
   ![shortest path](/screenshots/shortest_path.png)

## 4. System Design and Tools

![Design](/screenshots/design.png)

In this project, we decided to work like how a big tech companies work. Our first goal was
using the as much as cloud services. We choose working on AWS because some of us had a
background about it and we wanted to learn it. Our second goal was making this workflow as
professional as possible. It should have been easily maintainable, scalable, secure and continuous.
That is why we used a CI/CD pipeline, a private network, a modular source code design and some
auto-scaled AWS services.

We used GitHub as our sour control tool. This is where CI/CD pipeline starts. There were 5
branches in our repository. 3 of them were for our personal development branch, 1 of them was for
testing and merging our personal source code, and the last one was a main branch where we merge
our test code with it. As soon as we push into the main branch, GitHub actions triggers the pipeline
and build process of our source code starts. In GitHub actions we defined sensitive data as secrets(environment variables). They are also defined in our local project folder in the .env files.
But gitignore file includes .env files as always. We have two YAML files one for backend and one
for frontend. They basically tell what to build to GitHub actions. Since we wanted to separate
backend and frontend, they have different containers in AWS. So that, we needed to build two
different images in GitHub actions. In those YAML files, we defined installation and dockerization
commands. We have encountered a lot of errors in this process such as version incompatibility,
deprecated functions, etc. We solved them by downgraded the tools that we used and reading the
documents of them. Also, we followed the least privilege principle which is written in the AWS
documents. We created an IAM role which has only the necessary permissions and used that
role for GitHub actions to connect AWS services. After our images build, GitHub actions push it to
the AWS load balancer. This is the only public access point to our backend system. Rest of the
backend environment is in a private network that only allows the connections from other predefined
private IP addresses and ports.

For authentication we used AWS cognito, we did not want to store user credentials in our
database in order to follow the best practices. We only store the token that cognito generates in our
database in case of a database leak. Whenever we need an authenticated user activity such as
joining a chat room(socket.io) we use those tokens.
For programming our project, we chose React.js for our
main frontend framework. Because it allows re-usable components
anywhere in the code. This feature made us more flexible and
dynamic. Other than that,
we used D3js to visualize our node graph. It allows to do
modifications in every part of the grap. This feature was exactly
what we wanted. Also its build-in functions realy helped us to place
the nodes and edges without thinking the css. For the login section,
we used Amplify UI because it is highly compatible with cognito.

**All tools we used:**

- **AWS:** ALB, ECR, ECS, Fargate, Cognito, RDS, IAM, S3

- **Backend:** Nodejs, Fastlify, aws-sdk, jwt

- **Frontend:** Reactjs, SCSS, Amplify, Axios

- **Node graph:** D3js

- **Live chat:** Socket.io

- **Infrastructure:** Terraform, Docker

- **Source Control:** Github, github actions

_Note: The website is currently powered off because of the AWS costs. If you want to use the deployed website please contact with [Cem](https://www.linkedin.com/in/oktay-cem-kutlar-b12a40209/) via linkedn._
