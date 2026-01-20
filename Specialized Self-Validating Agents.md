Specialized Self-Validating Agents

0:00

If you want your agents to accomplish

0:02

loads of valuable work on your behalf,

0:05

they must be able to validate their

0:08

work. Why is validation so important?

0:10

Validation increases the trust we have

0:13

in our agents, and trust saves your most

0:16

valuable engineering resource, time. The

0:19

Cloudco team has recently shipped a ton

0:22

of features, but one in particular

0:24

stands above the rest. You can now run

0:27

hooks inside of your skills, sub aents,

0:30

and custom slash commands. This is a big

0:34

release most engineers have missed

0:36

because it means you can build

0:38

specialized selfidating agents

0:46

inside of this codebase. We're going to

0:47

kick off a new claw code instance and

0:49

we're going to run slash review finances

0:52

February. And then I'm going to look for

0:54

a specific February CSV file. Imagine

0:57

you're doing your monthly finances. This

0:59

is a system I'm building up to automate

1:01

some financial processing. I'm going to

1:03

copy the relative path of this and then

1:05

paste this here. This is going to kick

1:07

off an end toend pipeline of agents to

1:10

review finances, do a bunch of

1:12

formatting, generate a bunch of graphs,

1:14

and offer insights into this month's

1:17

finances. The important thing here isn't

1:19

the actual tool itself. Whenever there's

1:21

a new valuable feature, I like to build

1:23

against it and truly understand its

1:26

value proposition. So that's what we're

1:27

going to do here. This entire multi-

1:30

aent pipeline is going to run

1:31

specialized self validation every single

1:34

step of the way. You can see our primary

1:36

agent getting to work there. We're going

1:38

to let this run in the background and

1:39

we're going to circle back to this. What

1:41

I want to show you here is how to build

1:44

specialized self- validating agents step

1:47

by step. Let's start with the most

1:48

foundational and the most important, the

Custom Slash Command Hooks

1:51

prompt.

1:54

In cloud code, prompts come in the form

1:56

of custom/comands.

1:59

We're going to go ahead and create some

2:00

new agentics. So, I'm going to open up

2:02

the commands directory, of course, hit

2:03

new, and we're going to build a CSVedit

2:06

markdown file. All right, so this is

2:07

going to be a new prompt that helps us

2:09

edit CSV files. All right, so we're

2:11

specializing this command to do one

2:13

thing extraordinarily well and therefore

2:15

we're specializing an agent to do just

2:17

that. I have a code snippet AGP. If

2:20

you've been following the channel, you

2:21

know what this does. This is an agentic

2:23

prompt template and I've made some new

2:25

modifications to it. So you can see here

2:27

at the top we have a huge payload of

2:29

front matter. And the front matter is

2:31

what's going to allow us to build our

2:33

specialized self- validation via hooks.

2:35

And you can see here we have support for

2:37

pre-tool use, posttool use, and stop.

2:40

This is what's supported in prompt, sub

2:42

aent, and skill hooks. Whenever I'm

2:44

creating a new prompt by hand, which I

2:46

still do by the way, you know, I have

2:48

meta agentics to help me quickly spin up

2:50

new prompts, sub aents, and other

2:52

skills. But I do like to write prompts

2:54

by hand. You know, there are some areas

2:55

where you just want to scale and go

2:57

crazy with your agents. When you're

2:58

talking about building that system that

3:00

builds the system, when you're talking

3:01

about working on your agents and really

3:03

understanding agentic patterns and

3:06

tools, you want to slow down and do it

3:08

by hand. So, let's go ahead and write

3:09

this prompt. I like to go just top to

3:11

bottom here for a CSV edit. This is

3:12

going to be a CSV editing tool. So,

3:14

we're going to make modifications and

3:17

report on CSV files. All right. So,

3:19

that's how we're specializing this. And

3:21

we will intake a CSV file and we'll also

3:24

intake a modification. So, this is the

3:26

user request. We'll just call this user

3:28

request for our tools here. This is just

3:30

CSV file writing. So, we do want to

3:32

specialize this agent. We want the

3:34

ability to search. We want read, write,

3:36

edit, and I think that's it. So let's go

3:38

and get rid of the rest of these context

3:40

fork. We don't want this to run in a

3:42

separate agent. We want this to run in

3:43

the current agent we have. We want this

3:45

to be model invocable. Keep this as

3:47

false. And now we have the juicy part,

3:50

the hook. So what do we want to self-

3:52

validate here? Whenever we're operating

3:54

on CSV files, we want our agent to be

3:56

able to validate that that CSV is in the

4:00

correct format. And so that means we

4:02

want the post tool use hook because this

4:05

will allow us to after a edit write and

4:08

I'm going to go ahead and add read here

4:09

as well. So after any one of these

4:11

commands run, we're going to run a

4:13

specific hook. We're going to run a

4:15

specific script. So I'm going to go

4:17

ahead and get rid of pre-tool use and

4:20

stop here. So this will just echo uh

4:22

post hook. Let's go ahead and update

4:24

this to be an actual script we have

4:26

inside of the codebase. The way I'm

4:28

organizing my code bases now in the age

4:30

of agents with these powerful self

4:33

validation techniques looks like this.

4:34

So in your classic.claude, you know,

4:36

commands agent skills blah blah blah.

4:38

Inside of hooks, I like to store a

4:40

validators directory. And you can see

4:42

here I have a whole bunch of validators.

4:44

We're going to use one in particular

4:45

here, CSV single validator. And so I

4:48

want my agent to kick this off. So I'll

4:50

type uvun. We need the path to this

4:53

specific project directory. So we're

4:54

going to use this claude variable here.

4:56

And then it's going to be claude. And

4:58

we're basically just path to this,

4:59

right? So I can go and get the quick

5:00

reference to this. Paste that. And now

5:02

we have exactly what we need. All right,

5:04

this is it. You know, you can see here

5:06

every one of my validators outputs its

5:08

own log file. So we're going to dig into

5:10

this in just a second. What we have here

5:11

now is an agent that after every post

5:15

tool use call, it's going to run this

5:18

script. And I have this once variable on

5:19

here. I actually wanted to just keep

5:21

self- validating. So I'm going to remove

5:23

this. And then we have our actual

5:25

prompt. I've written thousands of

5:26

prompts by now. And one of the most

5:28

important things you can do inside of

5:30

your code snippets, inside of your meta

5:32

prompts and your meta skills, your meta

5:34

agentics, is create reusable formats so

5:37

that you don't have to think about it

5:38

and so that your agents don't have to

5:40

think about your prompt format. You

5:41

know, you can see here anytime I run

5:43

this code snippet, I'm going to get the

5:45

exact same structure. And again, if

5:47

you've been with the channel, you

5:48

understand the structure very well. I'm

5:50

just going to go ahead and start working

5:51

on this. All I need here is these two

5:54

sections. So the purpose this is going

5:56

to of course make modifications or

5:58

report and we actually want or report on

6:01

CSV files and then we have a three-step

6:03

workflow here. Read the CSV file and

6:05

this is going to be our first arg and

6:07

then second is going to be make the

6:09

modification or report. And then lastly

6:12

we're going to report the results. All

6:14

right. And I have cursor tab turned off

6:15

here just so we can do this manually on

6:17

our own. We don't want to get lazy with

6:19

all these great tools. Of course you

6:21

want to be using agents for most of this

6:22

stuff. When you're learning something

6:24

new, when you're setting up a new

6:25

pattern, I think it's really good to

6:26

just go in by hand and on your agentic

6:29

layer, you want to be doing things by

6:30

hand. Move a little slower. Don't move

6:32

at the agentic speed that you probably

6:34

normally are. You want to take your time

6:36

with this stuff because, you know, if

6:38

you learn how to deploy the core 4

6:40

context model prompt tools properly, it

6:42

will make you a very, very high impact

6:46

engineer. So, here we go. We have a CSV

6:48

edit prompt that is going to selfidate.

6:50

We're using pandas here. And so we're

6:52

just doing pd. uh read and that's

6:55

basically it, right? So you can imagine

6:56

whatever validation structure you want

6:59

to run here, you run it. And you can see

7:01

here if something goes wrong, we're

7:02

going to return a set of issues. The key

7:05

here is to direct your agent once

7:07

something goes wrong. So we have this

7:09

line here. Um when we're building out

7:10

our response to our agent after it's

7:13

called this validation command, we're

7:15

saying the following. Resolve this CSV

7:17

error in and then we're specifying the

7:18

file path. And then we're just going to

7:20

unload all the errors for our agent to

7:22

resolve. So let's go ahead and test this

7:24

in a new terminal window here. Cloud

7:26

code instance running opus. And then we

7:28

have a brand new / csvedit. There's our

7:30

argument hints thanks to our hint

7:33

parameter right here. Now we can just

7:34

pass in a CSV file to edit. So we're

7:36

going to use one of our mock csv files

7:38

here in the codebase. Mach input data

7:40

raw savings in February. And I'll just

7:43

copy the reference to that. Paste. And

7:44

now we're going to make a request. I'll

7:46

just do something simple. read and

7:48

report on the file structure. And so

7:50

this is going to be simple, right? We're

7:51

not actually doing a CSV edit here.

7:52

Maybe I could have named this something

7:54

a little different, but you get the

7:55

idea, right? This agent can read, edit,

7:57

and write. Let's see what it's doing

7:58

here. It found the file location, and

8:00

now it's just going to report on the

8:01

data structure. As you know, the magic

8:04

here is that after our agent runs, so

8:06

you know, here's our great report.

8:08

Nothing too fancy, nothing too

8:09

interesting here, right? But our agent

8:11

has run this self validation. The big

8:14

idea here is this is a self- validation

8:17

specific to this use case. I I can't

8:19

stress that enough how important it is

8:21

that this self- validation is hyper

8:24

focused on this purpose of this prompt.

8:28

The prompt extends to the sub agent

8:30

extends to the skill whatever you know

8:32

format whatever packaging you're putting

8:34

your prompts in that doesn't really

8:35

matter. Remember it all boils down to

8:37

the core four context model prompt

8:39

tools. In the end, every abstraction is

8:42

that this adds a powerful deterministic

8:45

layer that is again specialized. Let me

8:48

show you the result. This is one of the

8:49

reasons why it's so important to have

8:50

observability and to really log

8:52

everything. You can see here we have

8:54

output for our CSV single validator. And

8:56

you can see that everything passed fine.

8:58

We were able to perfectly parse this CSV

9:01

file. It is in fact a valid CSV file.

9:03

Now, let's break it and let's see what

9:04

our agent does when it has a specialized

9:07

self validation tool that can run. I'm

9:09

just going to break the CSV. I'm going

9:10

to remove this last quote here. Let's

9:13

see what happens now. Right? So, I'm

9:14

going to clear out this agent. So, it

9:15

has no information. I can just hit up

9:17

here a couple times. Right? So, CSV edit

9:19

same file report on the data structure.

9:21

Now, watch what happens here. This is

9:23

where the real magic is. It read and

9:26

right away because it ran that red hook,

9:28

it broke. And then our validator said,

9:30

"Hey, resolve this error that we found."

9:33

And the agent immediately fixed it. Now,

9:35

it's going to rerun. It's actually doing

9:37

that report properly. and it mentions

9:39

that fixed issue. So what happened

9:41

there? You know exactly what happened,

9:43

right? We've been working up to this

9:44

step by step. Our post tool use hook ran

9:47

and it inserted determinism into our

9:50

agents workflow. All right, so not only

9:53

did it do whatever we asked it to do

9:55

here and you know we're running a super

9:56

simple example. I'm sure some engineers

9:58

are thinking, "Wow, that was so simple.

10:00

Why are you just having a single, you

10:01

know, 20 line prompt for CSV validation

10:04

for updating CSV? You don't need that.

10:05

Blah blah blah blah blah. The models are

10:07

good enough now. Stop. Full stop,

10:09

please. You want to be building focused

10:12

agents that do one thing extraordinarily

10:14

well. Why is that? That is because a

10:17

focus agent with one purpose outperforms

10:20

an unfocused agent with many purposes,

10:23

right? With many tasks, with many end

10:25

states. We can now push this even

10:27

further with specialized hooks that we

10:30

can embed in our prompts, sub aents, and

10:32

skills. Why is this so important? This

10:35

is critically important because we can

10:36

push specialization further. My CSV

10:40

agent can now validate its work in a

10:43

deterministic way. This is ultra

10:45

powerful. I'm shocked that more

10:47

engineers aren't talking about this. I

10:48

think it really shows the kind of weird

10:50

gap right now. There's a lot of vibe

10:53

coding happening. Even engineers are

10:54

starting to just vibe code and turn

10:56

their brain off. Don't get lazy. Stay

10:59

sharp. Keep learning. And one of the key

11:02

ways to do that is guys, you have to

11:04

read the documentation. Actually sit

11:06

down and read the documentation. I'm

11:09

seeing way way too many engineers and

11:11

vibe coders just you come to the top of

11:12

the page, copy, you open up your Hunter

11:15

coding tool, you paste it in and you say

11:16

build PC of this. Okay. When you do

11:19

this, you learn absolutely nothing. The

11:22

whole journey of learning is the

11:24

journey. In the end, you gain that

11:26

knowledge for every other time. But when

11:28

you do stuff like this, right, and you

11:30

don't actually read the documentation,

11:31

you don't know what your agent is doing.

11:33

That is vibe coding. That is, you know,

11:36

leaning too heavy on the vibes if you

11:38

ask me, right? Because what's the

11:40

problem with this? The big key

11:41

difference between real engineering and,

11:44

you know, vibe coding or whatever you

11:46

want to call it, vibing, vibe

11:47

engineering, I don't really care what

11:49

term is used. Uh, the big difference is

11:50

that engineers know what their agents

11:53

are doing. Okay? if you want to know

11:55

what they're doing, you have to know and

11:57

you have to read the documentation of

12:00

the thing you're building against.

12:01

There's just no way around this. Um, so

12:04

anyway, small side rant. Um, I'm seeing

12:06

way too many engineers uh outsource

12:09

learning. That is how you begin the

12:10

self-deprecation process. You stop

12:13

learning. Highly recommend you just, you

12:14

know, take the time, read through the

12:16

documentation, understand what you can

12:17

do so you can teach your agents to do

12:19

it. Okay. Um, so anyway, so this is very

12:22

powerful. Our agent resolved that error

12:25

on its own. And now anytime I run this a

12:27

CSV edit, the agent is going to validate

12:29

it when it finishes. Okay. And that's

12:31

it. You can, if you want, you can stop

12:34

the video now. That's that's it. Self

12:35

validation is now specializable. Before

12:38

we were stuck writing global hooks in

12:40

our settings.json file like this, you

12:43

know, you would write out the hook here.

12:44

And that was great, very important, very

12:46

powerful. You'll still want to do stuff

12:48

like that. For instance, we built out a

12:51

cloud code damage control skill that

12:54

protects your codebase and just like

12:56

very quickly sets up, you know, powerful

12:58

hooks to block commands. But what we get

13:00

here is something really, really

13:03

powerful, something really

13:03

extraordinary. It is specialized self

13:06

validation. You've heard me say it a 100

13:07

times. That's really what's happening

13:09

here, right? This is the one idea I

13:11

wanted to share with you today. Now,

13:12

this is just the prompt, right? Let's go

13:13

ahead and see what this looks like

13:15

inside of a sub agent and a skill. It

13:17

looks very similar, but there are a

13:19

couple, you know, caveats and couple

13:20

things to mention along the way.

Subagent \& Skill Hooks

13:25

If we open up the release notes here, so

13:27

I'll just search for hooks. It's insane

13:29

that this valuable feature was just kind

13:31

of buried into this list of bullet

13:34

points, but the cloud code team has been

13:36

absolutely cooking. Anyway, so what am I

13:37

trying to say here? There's a weird

13:39

thing that's happening right now where

13:40

the Cloud Code team is kind of combining

13:43

skills and custom slash commands into

13:46

one. I'm not really a huge fan of this.

13:50

Uh, let me just search for skill, I

13:51

guess. Right. Yeah, merge slash command

13:53

and skills. Very, very interesting. I

13:56

think the team maybe realized that they

13:58

truly did just build out a another way

14:01

to run slash commands, which again kind

14:04

of validates our our foundational idea

14:07

that we talk about on the channel all

14:08

the time with the core 4. Everything

14:10

just turns into a prompt that runs into

14:12

your agent. Context model prompt tools.

14:14

You've heard me say it a million times.

14:15

I'm going to say it a million more times

14:16

because a lot of information out there

14:18

around agents is very hype fililled and

14:22

very uh kind of void of raw information.

14:24

Oftent times in engineering when you're

14:26

learning a new skill when you're

14:28

building up a portfolio of expertise

14:31

there's really like four foundational

14:34

facts that if you understand them and

14:36

master them you will go uh

14:38

extraordinarily far and you'll become

14:39

very very capable. The core four is one

14:41

of them and you know you can see that

14:43

here. merge/comands and skills. They're

14:46

the same thing. It's a prompt. So

14:47

anyway, just wanted to mention that.

14:48

Let's see what self validating inside of

14:51

sub aents and skills looks like. I'm

14:53

going to hop over to agents. You can see

14:54

I have a few agents here. We want a

14:56

CSVedit agent. All right, so we're going

14:58

to build the exact same thing but as an

15:00

agent. So what do agents give us? Agents

15:03

give us two key things over a prompt.

15:05

They give us parallelization, right? So

15:07

we can parallelize our work. We can

15:09

deploy multiple agents at one time. And

15:11

they also give us context isolation and

15:14

effectively delegate our context window.

15:17

I have a snippet for this ag. This can

15:20

be an agentic agent. And you can see

15:22

here we have that same kind of format.

15:24

All of our options listed out right

15:26

away. And then we can dial into exactly

15:28

what we want. Right? So I like to just

15:29

give myself all the options when I'm

15:31

working and then I can dial it down or

15:32

of course I can have an agent dial it

15:34

down as well. CSV edit agent. And I'm

15:36

just going to do some copying here from

15:38

our previous prompt here. use only when

15:42

directly requested. And then I'll say

15:43

CSVEit agent just to make that super

15:46

clear. We don't need all these tools. In

15:49

fact, we can just mirror our tools from

15:52

our prompt. And we don't need

15:53

disallowed. There's our model permission

15:55

mode. We can just get rid of that

15:57

skills. We're not going to be using a

15:59

skill. And then we have our hooks. Same

16:00

deal. We're going to delete pre delete

16:03

stop. And I'm just going to go ahead and

16:04

copy over this. And what else? I deleted

16:08

something there. Oh, the color. Sure,

16:10

Sam. And I'm just going to copy the

16:11

exact same prompt too. So, you know,

16:13

you'll notice this looks very, very

16:15

similar, right? The structure is very

16:18

similar, a little bit different because

16:19

remember prompts can intake arguments

16:22

whereas sub aents just kind of take the

16:24

prompt that's passed into them. And so,

16:26

we might tweak something like this. Pull

16:28

from prompt and then pull from prompt or

16:32

like determine from prompt is probably

16:34

better language here. Fantastic. So, we

16:36

can do the same thing. Let's kill this

16:37

agent. And our agentic workflow probably

16:39

completed. Nice. We had an 8minute

16:41

agentic workflow that automatically

16:44

agentically handled my finances for this

16:46

month. And of course, I'm using mock

16:47

data. It's not actually my finances. We

16:49

got a great breakdown here. We'll circle

16:50

back to this in just a moment. I want to

16:52

show you the sub agent using specialized

16:54

selfidation. And what we'll do is we'll

16:56

deploy one agent per file. Again, that's

16:58

what sub agents give you. They give you

17:00

parallelization so that you can scale

17:02

your agents across multiple versions.

17:05

Use one CSV edit agent per file in mock

17:10

input data and append three new rows two

17:14

expenses file we properly increment the

17:17

balance okay because in these CSV files

17:20

you know you can see here we will have a

17:22

balance and let me actually turn on my

17:24

UI for this so you can see here we have

17:26

a balance and this moves upward so when

17:29

this moves up we add 650 here because

17:31

this is a deposit that's why I added

17:33

that line right make sure that the

17:34

balance is are correct. As we move

17:36

upward, we're going to kick off four CSV

17:38

agents in parallel to edit each one of

17:41

these files. There you go. You can see

17:42

we are starting to stack these up. And

17:44

again, the big idea here is that after

17:48

every one of these agents run, they're

17:49

going to validate the file they just

17:52

operated in. Not only do we have

17:53

individual prompts that can self-

17:55

validate, we have sub agents that we can

17:57

scale that self- validate. Okay, really

18:00

think about this. Really think about

18:01

this. This is specialized self-

18:03

validation. You can scale specific

18:05

commands, right? Check out my other

18:07

commands here. Build.m MD. I have a

18:08

llinter. I have a formatter running here

18:10

using the brand new astral uvty and

18:13

rough tooling. You know, this is going

18:15

to run after my build agent runs every

18:17

single time. Okay? So, we have two hooks

18:19

running here on stop. So, when the agent

18:21

finishes, it's going to look over all

18:23

the code here only when the build agent

18:25

runs, right? So, we're not running

18:26

commands when we don't need them. We run

18:28

them in specific use cases. This is just

18:30

two simple examples of this, right? You

18:32

can really really scale this all the way

18:34

down to the prompt, but then you can

18:35

push it into your own agents and your

18:37

own skills. And so this is where this

18:40

gets really powerful. Imagine you're

18:41

doing a migration. Imagine you're

18:43

updating some fields in the database.

18:44

Imagine you're doing any type of work

18:46

that you yourself would come in and

18:49

validate. You can now teach your agents

18:51

to do this. This is a big idea we talk

18:53

about all the time. This is a closed

18:55

loop prompt now. Okay? And we don't even

18:58

have to prompt engineer it anymore. You

19:00

still can if you wanted to, right? You

19:02

could say something like this. Validate

19:03

your work with XYZ, right? So you would

19:05

say UV run blah blah blah blah blah CSV.

19:08

You might need to build an additional,

19:10

you know, in agent validation command

19:12

because the inputs here are a little bit

19:13

different, but you get the idea, right?

19:15

You can still do this. There's nothing

19:16

wrong with this. But the massive benefit

19:19

of throwing this inside the hook is that

19:21

you know this will always run. Okay? And

19:24

so every time one of these tools are

19:26

called inside of this agent, it is going

19:28

to validate its work. Okay? This is a

19:30

guarantee. And this is why, you know,

19:32

the Ralph Wiggum technique, all these

19:35

kind of prompts plus code, agents plus

19:38

code, these techniques are starting to

19:39

gain popularity. It's for this reason.

19:41

You're adding trust into the system.

19:43

You're having your agents validate their

19:45

own work. That saves you time. You're

19:47

not doing the validation. You're just

19:48

making sure that you set the system up

19:50

right. And this is a big theme we're

19:52

going to see moving forward in the age

19:54

of agents. You know, the engineers that

19:56

are building the agentic system in

19:58

tactical agentic coding. We call this

20:00

the new ring around your codebase. You

20:03

don't work on your application anymore.

20:05

You work on the agents that run your

20:07

application. Okay? And the big idea here

20:10

is that you can now have agents that you

20:12

quite literally trust more by just

20:15

adding the right hooks, the right

20:17

validation. Ralph Wiggum, all these

20:19

techniques on the channel, we've

20:21

discussed this. Agents plus code beats

20:24

agents. Okay, that's it. It's that

20:27

simple. That's what self validation is.

20:28

That's what the closed loop prompt is.

20:30

This is what it looks like to really

20:33

teach your agents how to build an

20:35

engineer like you would, right? It's

20:37

it's by doing things like this. Every

20:39

engineer, every good engineer at least,

20:41

validates their work. And soon it's

20:44

going to be the exact same thing with

20:46

your agents. Every good specialized

20:49

agent, great at doing one thing well,

20:51

will validate that one thing. Okay? I'm

20:54

I'm very against this kind of generalist

20:57

do it all super omni agent where you

20:59

just nuke the context window over and

21:01

over. I I'm highly convicted that if you

21:04

want to build an agent that outperforms

21:06

over and over and over, you build a

21:09

focus specialized agent. Even down to

21:11

something like this, right? This is a

21:13

real agent that I would build out

21:14

CSVEdit agent. We just edit CSV files.

21:18

That's it. It's not that you can't do

21:20

this with a, you know, bigger agent

21:21

doing 10 20 different things. Opus is

21:23

very powerful. It can do that. That's

21:25

not the point. The point is that this

21:26

will perform better over tens, hundreds,

21:29

thousands, and millions of runs. Okay?

21:32

If you want to scale, you want your

21:34

agents self validating and not just any

21:37

validation. You want your agents

21:39

specializing their self validation. All

21:41

right? So, that's the value here. We

21:43

don't need to walk through building the

21:44

skill. You know what that looks like.

21:45

You know, you do CSV edit skill and then

21:48

you, you know, build out skill.md. And

21:51

then I have a coach template for this.

21:52

basically more or less the same thing.

21:55

So, I'm not going to build this out. You

21:56

get the idea here. I'm going to go and

21:57

just delete this and I'll go ahead and

21:59

commit the other two and you'll have

22:01

access to this codebase if you want to

22:02

poke around what's happening here and

22:04

understand how you can, you know, build

22:05

out some more self validation. But you

22:07

can see all those four agents ran in

22:08

parallel. They validated their work and

22:11

we can prove it. Again, you want to have

22:13

proof that these things ran hooks and

22:15

CSV single validator. We can scroll to

22:17

the bottom here and you can see every

22:19

one of those files was validated at

22:21

basically the same time within a second,

22:23

right? That's because we use

22:24

parallelism. We have edits that we know

22:26

worked. Okay, let me just say that

22:28

again. We have edits from our agent that

22:30

we know worked because we gave them the

22:32

tools to validate their own work.

Finance Review Agent Pipeline

22:37

You know, you can see here we had a

22:39

bunch of stuff run and it outputed

22:40

something like this, right? So, all we

22:42

did was pass in a CSV and it gave us

22:44

this. Here was our previous version,

22:46

January 2026. And here's our new version

22:49

here. Sorry for the uh light glare

22:52

changes there. But you know, just a

22:53

simple highle view of finances. This is

22:55

a real use case of generative UI, by the

22:58

way. Um, some of this is static that I

23:00

had the agent generate over and over.

23:01

Some of it is dynamic. So, some of these

23:03

tables that it created. I had no idea it

23:05

was going to create. You know, you can

23:06

see here we have a bunch of insights

23:08

about our spending for the month, right?

23:10

All the way down to the table level. We

23:11

can sort this. We can see our burn. we

23:13

can see our income balance blah blah

23:15

blah. I know some people don't trust

23:17

models and model providers to do stuff

23:19

like this. I think it's totally fine.

23:20

This is what this tool did, right? We

23:22

had a full agent pipeline build this

23:24

out, a team of agents. And once again, I

23:26

can tell you I was very, very confident

23:28

that this was going to work end to end.

23:31

Okay? And why is that? You already know

23:33

what I'm going to say. If we open up

23:35

this prompt, review finances. I had a

23:37

single prompt and we can go and collapse

23:39

this. You can see I'm once again using

23:41

our great agentic workflow pattern.

23:43

Nothing new. It's the same thing over

23:46

and over and over. Um, you'll notice

23:47

that about this channel. We are very

23:49

consistent and we're always focused on

23:51

using the best tools for the job. All

23:53

right. Hyperfocus on the signal in the

23:55

industry, not hype, not noise, not

23:56

anything else. And you can see here,

23:58

right? You can see something very

23:59

powerful. I have an HTML validator

24:00

running here on the top level. Frankly,

24:02

on the review finances, this is the kind

24:04

of super workflow. So you can see here

24:06

this workflow is actually kicking off

24:08

multiple agents underneath it. All

24:10

right, we have the agent chain here. So

24:11

we are chaining together multiple

24:12

agents, multiple steps. And you know,

24:14

you can see here we're running a whole

24:16

slew of different specialized agents.

24:18

Guess what they're going to do? Yes,

24:19

they're all going to validate their

24:21

work. Let's hop into our categorize CSV

24:23

agent. Check that out. Let's hop into

24:25

our uh generative UI agent. There's that

24:27

HTML validator. Let's hop into our merge

24:29

accounts. There's a CSV validator. On

24:32

and on and on. And you can see here we

24:33

have this normalized CSV agent actually

24:35

running two validators. And these are

24:37

running on the stop command. So when it

24:39

stops, I'm running some kind of global

24:41

validators that run on all the files in

24:43

this codebase because why not just test

24:46

all the files. Kind of general rule of

24:47

thumb, if you want to test a bunch of

24:49

files at the end of your specialized

24:51

hooks, you can use the stop hook. And if

24:53

you want to test just one file like we

24:55

did, you probably want to go for that,

24:57

you know, post tool use so that inside

25:00

of your script, you get access to the

25:02

the path that was read, edited, or

25:04

written to. Feel free to check out this

25:06

codebase. I built this as a kind of

25:08

working prototype to quickly run finance

25:11

review to calculate, you know, expenses

25:13

and income for the month. Make sure you

25:15

have this in your own private codebase

25:16

if you decide to fork this, pull ideas

25:18

from it, whatever. The big idea here is

25:20

you can build out specialized self

25:23

validators inside of your prompts, your

25:25

sub agents, and your skills. Now, and if

25:28

you're really pushing this stuff, um,

25:29

you can do something really, really

25:31

cool. If we close this, we run claw--p

25:41

uh, settings. You can inside of your

25:43

primary agent pass in an entire settings

25:46

file as JSON and that includes hooks.

25:50

All right, I'm just going to leave you

25:51

with that idea. You can take validating

25:52

agents to another level with this.

25:54

Comment down below. Let me know how

25:56

you're using hooks. I'm super curious if

25:59

you have turned on specialized hooks. If

26:01

this is the first time you're seeing

26:02

this, no problem. It's really not

26:04

getting enough attention. Engineers, you

26:06

got to be careful. You got to make sure

26:07

you're still learning and still

26:09

internalizing knowledge. Don't delegate

26:11

learning to your agent. All right? It

26:14

doesn't do you or them any good outside

26:16

of that one shot that they run in. All

26:18

right? So, make sure you're still

26:19

reading the docs. Make sure you're still

26:21

following, you know, the big releases

26:23

coming out of these leading tools,

26:25

technologies. Obviously, cloud code is

26:27

the leader in agentic coding and it

26:29

allows us therefore to tap into this new

26:31

role of engineering we're calling

26:33

agentic engineering. Opus 4.5 has been

26:36

changing the game for a while and it's

26:39

very clearly a step change forward into

26:42

the future of engineering. But be very

26:44

careful with this stuff. Do not overuse

26:47

these models to the point where you're

26:49

not learning anymore. That's kind of the

26:52

meta idea I just want to, you know,

26:53

leave you with here today. All the

26:55

potential we can have with agents is

26:56

incredible. But if you delegate the

26:58

learning process to your agents, you

27:01

will be stuck. You will not continue to

27:03

grow. And the worst thing any engineer

27:06

can do is start the self-deprecation

27:08

process by not learning anything new.

27:10

All right, definitely check out

27:12

specialized self- validation in the form

27:15

of hooks inside of your custom/comands,

27:18

aka prompts, your sub aents, and your

27:20

skills. You know where to find me every

27:22

single Monday. Stay focused and keep

27:25

building.

