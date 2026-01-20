0:00

This video we're going to be talking

0:01

about the easiest way that I have found

0:03

to run a Ralph loop. If you're not aware

0:05

of what a Ralph loop is, it's a way to

0:07

put a language model into an infinite

0:09

loop that will literally never stop

0:11

until the job is complete or until you

0:14

run out of token money.

0:17

And so what we're going to do in this

0:18

video is I'm going to show you how to

0:20

actually implement a feature from coming

0:23

up with the idea for the feature all the

0:25

way through to running this loop to

0:27

completion. and we're going to do it

0:29

with what I have found is the simplest

0:32

and most straightforward tool if you're

0:34

someone that does not want to mess

0:36

around with configuring bash scripts or

0:40

running Anthropics official plugin which

0:42

isn't even really a Ralph loop. So

0:44

before I get into the tool and show how

0:46

it works, let's spend 30 seconds talking

0:48

about what a Ralph loop actually is. So,

0:51

a raph loop is basically a way of

0:54

creating a prompt that endlessly feeds

0:57

back into itself until it is actually

1:00

done building the feature or doing the

1:03

thing that you want it to do.

1:06

Hi, Lisa. Hi, Super Nintendo Chmers.

1:11

I'm learning. And so it starts off with

1:14

a prompt that is literally calling

1:17

claude to start back up or whatever tool

1:20

that you are using for purposes of this

1:23

loop. So it spins up a new instance of

1:26

claude and then what it takes in is a

1:29

series of all of your tasks. So this

1:31

would be like a task tracking file where

1:34

you have every single thing that needs

1:35

to be done listed out. You have the

1:37

testable criteria to say if task one or

1:41

task two or task three is actually done

1:44

like were the files created. Do my tests

1:47

pass. You have all of that listed out.

1:49

And then you have a simple flag saying

1:51

is the task done or is it not done? And

1:54

so what happens is every time cla gets

1:57

launched back up, it reads through to

1:59

see what has it done so far and what is

2:02

still left to do. It picks out the task

2:05

that it's going to do and then once it's

2:07

done with that task, it checks to see if

2:09

it is done or not. Now, if it is

2:12

actually done with all of the tasks that

2:15

you gave it to make this feature or

2:17

debug the thing or do whatever it is,

2:19

it's going to literally print out the

2:21

words complete. And this is the only way

2:24

that this Ralph loop is allowed to exit.

2:27

If it reads literally reads in the

2:30

terminal that the work is complete. If

2:32

that is not true or that does not happen

2:35

and we say no the work is not done then

2:38

it literally goes all the way back to

2:40

the beginning creates a fresh context

2:42

window inside of claude and then

2:44

proceeds to run through the entire loop

2:46

over again. And that loop literally just

2:48

continues forever and ever and ever. And

2:51

there are other options that you can

2:53

plug in to help control pieces of this

2:55

process. But on a high level, that is

2:58

what's happening. So, there's a few ways

3:00

that you can actually do this. Number

3:02

one is going to be with an actual bash

3:05

script, which is what all of the Giga

3:07

Chads are going to use. Uh, number two,

3:10

you could use a plugin, but the funny

3:13

thing about Anthropics plugin that they

3:15

have for this is that it's not actually

3:17

really a Ralph loop because it doesn't

3:19

create a fresh context window each time.

3:21

At least not at the point that I'm

3:23

recording this. And then number three,

3:25

you can use a simpler tool that helps

3:28

manage all of that stuff. And that is

3:30

what we are going to be looking at

3:31

today. It's a tool I stumbled across on

3:34

X and it's called Ralph Tui. And so all

3:38

you need to do in order to use this

3:40

thing is install it via this command. So

3:43

it's bun install-g

3:46

Ralph Tui. And the thing that's nice

3:49

about this is it actually has a PRD

3:51

generation phase built into it. So it'll

3:54

help you generate your PRD and then take

3:56

that PRD and generate all the tasks that

3:59

it needs in order to run this thing

4:01

properly. So that being said, let's go

4:04

in and actually build this thing out. So

4:05

what do I want to actually do? Well,

4:07

inside of this thumbnail app that we

4:09

have, the one thing that I really don't

4:11

like is that when I move in and I make

4:13

an edit, it's not actually preserving

4:17

the history. So, I can't now go back in

4:19

time and see what all of the previous

4:22

versions of this thumbnail were, and I

4:25

want to be able to do that. And so, I

4:27

want to use this Ralph system to build

4:30

out this version history capability

4:34

where I can see what the prompt was that

4:36

I gave and then what the next output

4:39

was. And then ideally, if I can, I'd

4:42

like to be able to branch off of a

4:44

specific version and use that version

4:47

for my subsequent edits. So that is what

4:49

we're going to try to build out with

4:51

this Ralph tool. Now, the way that we're

4:53

going to kick this off is we're going to

4:55

go into our project. So, in this case,

4:57

we're in my Thumbi V2 project, and we're

5:01

just going to type in Ralph Tui and then

5:05

create PRD. And what this is going to do

5:07

is this is going to help us actually

5:09

generate that PRD that we'll then use to

5:12

generate the tasks which makes this

5:14

whole or helps makes this whole Ralph

5:17

process actually work. And this is the

5:19

reason that I think this tool is the

5:20

easiest for people that don't want to

5:22

mess around with all of that other

5:24

stuff. It's very easy and very guided.

5:28

So that is what we are going to use. So

5:30

we're going to start off. I'm going to

5:31

pause real quick and just describe the

5:32

feature just like I did to you guys. and

5:34

then I'll show you how the system works.

5:36

So I have just said what it is that I

5:38

want to build just like we talked about

5:40

and what you'll notice is that it is

5:42

using claude code in this case. So it is

5:45

configured to use whatever coding agent

5:48

you are using. Now, if you want to see

5:51

more details about which tools are

5:53

actually supported and all of that, you

5:55

can go look at their website and go into

5:58

the docs and actually look to see how

6:00

you can configure this based on what you

6:03

are using and the tools that you want to

6:05

have. So, what it's going to do from

6:07

here is it is going to ask us questions.

6:10

So, it's going to attempt to clarify

6:11

what the biggest ambiguities are. We're

6:14

going to go through and answer these

6:15

things and then we will generate the

6:18

task list from there. So after this

6:20

process is finished, we now have a PRD

6:24

outlined. Okay, so this is going to be

6:26

similar to a PRD that you might make in

6:28

some other type of process where we have

6:30

a breakdown of all of our user stories

6:32

and then we have our acceptance

6:34

criteria. And this is really important

6:36

because this is how we can actually run

6:39

a Ralph loop. If we know what the

6:41

acceptance criteria is meant to be for

6:44

that feature, then we can allow a tool

6:47

like claude or whatever tool you're

6:49

using to check that that thing was

6:51

actually done and not leave the task

6:54

until it is done properly. So that is

6:56

really the power of this Ralph loop is

6:58

that it will continue to iterate through

7:00

even if it fails and it will just change

7:03

its approach next time until the thing

7:05

is actually working. So what we can do

7:07

from this now that we have a PRD is well

7:10

we naturally need to turn this then into

7:12

a series of tasks. And so what we can do

7:15

is we can just type in the number one.

7:17

And what this is going to do is it's

7:19

going to move through and it is going to

7:21

create our task list that will be used

7:24

to actually run this loop. Okay. Okay,

7:26

so now that that has run through, if I

7:28

hit the number three, we can see that we

7:30

now have a series of seven different

7:34

tasks all pertaining to different user

7:37

stories that are loaded up inside of our

7:42

system. And so the thing that's nice

7:43

about this tool is that we can really

7:45

easily control the number of iterations

7:48

that we want to allow. So, for example,

7:51

if I were to hit the plus or the minus

7:52

symbol, I can control how many times I

7:55

want to allow this loop to just continue

7:58

going until we say that's enough. You

8:00

need to stop now. And so, this is going

8:03

to be nice because at a certain point,

8:05

you might need to pull the plug if it's

8:06

clear that the thing is not working,

8:09

right? And so, I've configured this to

8:11

have 50 tasks that it can run through

8:14

and it is off and running. So, this

8:16

thing has started and it is going to

8:18

start moving through all of these tasks

8:20

until the feature is complete. And we

8:22

have a nice little timer up here showing

8:24

exactly how long this thing is or has

8:28

been running for. So, at this point, I'm

8:31

going to go take my dog for a walk and

8:33

we're just going to let this thing run.

8:34

Poncho, where do you think our Ralph

8:36

Wiggum loop is? Poncho boy, what's Ralph

8:38

doing? Poncho doesn't believe instead

8:41

the Ralph loop still running. So, you

8:45

want us to run back home, check it out.

8:47

We're going to find out. I think it's

8:49

been like 30 minutes. All right, guys.

8:51

So, this thing just finished running

8:53

through. And we can see everything from

8:57

this version right here. So, the only

9:00

thing that you'll notice that actually

9:01

failed was this task number five. So, it

9:04

ran it twice. So, story five. And that

9:08

happened because my internet went out.

9:09

So, it wasn't able to call Claude and

9:11

then it just failed. So, if we look at

9:12

this, this ran for about 40 to 45

9:16

minutes, it looks like across all of

9:19

these different stories. And again, I

9:21

wasn't in front of the computer. I was

9:22

out doing something while this thing

9:24

ran. But, of course, we need to check in

9:27

that this thing actually worked. So,

9:30

let's do that. So now that this thing is

9:33

like actually complete, if we were to

9:35

pop through and look at all the

9:37

different stories, we can look through

9:39

and see the details of like what we had

9:42

set up and what it moved through, what

9:44

the acceptance criteria was, all of that

9:47

type of stuff. So you always have this

9:49

that you can go back and look at and you

9:51

can run that log command like I was

9:52

looking at earlier to see more details

9:55

about the commands that ran. But let's

9:57

make sure that this thing actually is in

9:59

fact working. So, we should have this

10:02

version history now where we can kind of

10:04

look at different versions, compare them

10:06

side by side, and then branch off from

10:10

an older version to start making edits

10:12

from that image. So, we really have a

10:15

few different like features that roll up

10:18

into one bigger suite of features. So,

10:20

let's go check out what we built. So,

10:23

here we are back in the gallery. And if

10:25

we were to go click in and look at one

10:27

of these, so this is the image. if we

10:29

went to the edit view. So, we can see

10:31

that now we have this film scroll or

10:34

whatever they called it on the bottom,

10:36

which is pretty cool. Um, this has an

10:38

error with this loading thing, but it is

10:40

in fact there. So, we can kind of pan

10:42

through all the different versions that

10:44

we've had of this image where we are

10:46

trying to dial in this Gemini logo a

10:47

little bit. And then we can go back and

10:49

say that we want to compare, which is

10:52

pretty nice. So if we were to click on

10:53

that first image and then the third

10:55

image for example, we can see what the

10:58

prompts were that actually resulted in

11:01

each of these individual images. So this

11:04

is pretty uh pretty cool. We have this

11:06

comparison function. So that was the

11:08

first major thing that we were that we

11:11

were looking at. But we obviously we

11:12

have some sort of error that's popping

11:13

up down here. And so I'm going to need

11:15

to go take a look and see what this is

11:19

all about. So guys, this is something

11:21

really valuable to look at in the

11:24

context of the Ralph loop because people

11:26

make it seem like this stuff just works

11:27

all the time out of the box and you

11:29

never run into errors. But here we're

11:31

having an issue. And what is that issue?

11:34

Well, what's supposed to happen is that

11:35

when we come down here, we're supposed

11:37

to be able to branch off from one of

11:39

these images. But number one, it's not

11:41

really clear in the UI that that can be

11:43

done. And number two, the way that it's

11:45

supposed to happen is that when I

11:46

rightclick on one of these down here,

11:49

this is meant to open a subcontext menu

11:51

that has a branch option. And that's

11:53

obviously not working. So let's go back

11:55

and look at what our PRD task file was

11:59

and see if there's something that we

12:00

could have done differently. So now that

12:03

this thing has actually fixed this, if

12:04

we were to come back through here and

12:06

rightclick, we can see that we have this

12:07

option to branch branch the thumbnail,

12:11

right? like to continue forward from

12:13

this point in time. So maybe I didn't

12:15

like what happened in this third edit

12:17

and I wanted to go back here. I could

12:19

just come down here and choose this

12:20

option to branch. And now this is the

12:24

like the kind of the first thumbnail,

12:27

right? This is the one that the all the

12:28

future ones are going to actually be

12:30

based on. Now what obviously didn't

12:32

happen is that this Ralph loop did not

12:35

test that in the browser. So what most

12:37

likely happened was that it saw that

12:39

those components were actually created

12:41

or generated in the actual codebase, but

12:46

it didn't actually go in and test

12:48

anything in the browser because if it

12:50

had tried to do that, it would have seen

12:52

that by right-clicking nothing actually

12:55

popped up and nothing actually happened.

12:57

And so there's a few ways that we can

12:59

address this, but the one that is the

13:01

most straightforward is that you should

13:03

be where appropriate, creating test

13:07

files and making sure those test files

13:10

actually pass. So in this case of the

13:14

missing

13:16

submen to create that branching logic

13:20

that wasn't actually triggering when we

13:22

rightclicked on it. That is something

13:24

that in theory could have been very

13:26

easily tested for with a testing library

13:29

or even using some sort of browser

13:32

automation MCP. So what we're going to

13:35

do in order to help overcome some of

13:37

these issues is that we are going to

13:41

tell the system in this case the the

13:44

Ralph Tui that after we get this list of

13:48

tasks from the system like we have in

13:50

this case where we're creating now a new

13:52

feature which is a title generation

13:54

feature that it needs to specifically do

13:58

a few things. number one that it has to

14:01

run the linting and the testing to make

14:03

sure it did not break something in the

14:06

course of doing its tasks. And then also

14:09

if it is creating a physical UI that

14:12

needs to be shown to people, we want to

14:14

make sure those things are testable

14:17

because if we're not doing that, it's

14:19

going to rely on you as the user to go

14:21

in and actually test those things. So

14:24

you need to draw that line of how much

14:26

test coverage you want to have and plan

14:29

that into how these things work. And

14:32

then last but not least, one of the

14:34

things that makes a Ralph loop really

14:35

powerful is that you generate a git

14:38

commit every single time you perform a

14:42

task. What that means is the system then

14:46

has a running log of everything it's

14:49

ever done, the specific commit. It can

14:51

then go in, look at all the files, see

14:53

the reason that things were done. It's a

14:55

lot more powerful of a way to do

14:57

something, and it's not done by default,

14:59

as far as I can tell inside of this

15:02

tool. So, all we need to do is make sure

15:05

we specify before we start moving

15:08

through and running the Ralph loop that

15:10

it knows that we want those things to be

15:13

done. And so, that is exactly what it

15:15

did here. It went through and it updated

15:18

all of our tasks to make sure that it

15:20

runs the linting, it runs the type

15:22

check, it runs tests and it actually

15:24

generates a git commit so that we can go

15:27

back and track this stuff later, right?

15:30

And so now if we were to go and look at

15:31

like the acceptance criteria for any of

15:33

these tasks, we can actually see these

15:36

things being there very specifically,

15:38

which is great. And there's a lot of

15:40

ways that you can think about

15:42

implementing this type of thing. Like a

15:43

Ralph loop is not something that's it

15:46

can only be done one way. It's a concept

15:48

that you can apply to anything you want

15:51

to do. And so what we're doing in this

15:52

case is trying to make our concept of

15:55

how we think it should be done with

15:57

running tests and running git commits

15:59

and we're putting that into this really

16:01

nice easy to use kind of tool. So now

16:05

after this thing is done we can say hey

16:07

this thing is done. Now we have all of

16:10

these tasks lined up for us and ready to

16:12

go. And we can just say start and this

16:15

thing is going to run through move and

16:17

groove and do its thing probably for the

16:21

next hour or so, maybe a little bit less

16:23

than that. And so one thing that's

16:24

really cool now that this thing's been

16:26

running for a few minutes that we can

16:27

see is this change in its first pass

16:31

actually created errors inside of our

16:34

Gemini client file because it needs to

16:37

now edit that file to do what it is

16:39

doing. And so before we asked it to do

16:42

the testing, it would have just made

16:45

this change and move forward and it

16:47

might never have actually caught this

16:49

error that it created. So this is the

16:51

value in making sure your Ralph loop has

16:54

testing and then it actually commits its

16:57

changes in increments. So there you have

17:00

it. A very new tool by the way. This

17:02

thing has come out I think in the last

17:03

week and it's already very effective.

17:05

I'm sure they're going to build out a

17:06

lot of really awesome features on top of

17:09

this. Now, an important thing to keep in

17:11

mind with all of this is that you still

17:13

have to have a process of generating the

17:17

spec, generating the thing that you're

17:19

going to build in the first place. A

17:20

Ralph loop is really cool in that it can

17:23

iterate through a task list forever, but

17:27

you still need to have the task list.

17:29

And certain tools are better than others

17:31

at creating those sorts of things. So,

17:33

if you want to see a video where we go

17:36

from having a raw concept fully through

17:39

to detailed task lists that can be

17:42

implemented inside of something like a

17:44

Ralph loop, I will link to a video right

17:47

next to me where you can check that type

17:49

of process out using a tool like GitHub

17:52

spec kit. But that is it for this video.

17:53

I will see you in the next

