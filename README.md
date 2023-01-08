# Mahoot: A curation protocol for Mastodon (using Pinafore)


<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootLogo1.png"
     alt="Mahoot Logo">
</p>

- [Using Mahoot](#using-mahoot)

- [Why is it called Mahoot?](#why-is-it-called-mahoot)

- [Caveat](#caveat)

- [Authors](#authors)

- [Running it yourself](#running-it-yourself)


Mahoot is a working *proof-of-concept* software that implements a client-side [curation protocol](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md) for the decentralized microblogging network [Mastodon](https://joinmastodon.org). It provides fine-grained control on how you consume Mastodon content. The Mahoot protocol is implemented as modifications to [Pinafore](https://github.com/nolanlawson/pinafore), an open-source web client for Mastodon.

Normally, social media platforms have algorithms that are optimized to benefit the company that owns them — the more time people spend on the platform, the more money a commercial platform makes. This isn't necessarily optimal for you, as it may not be the most productive use of your time. The non-commercial Mastodon comes with no default algorithm to curate the feed, which sounds good in principle but has its own downsides. A "firehose" approach does not scale well when you start to follow lots of people (or topics). This may dissuade you from increasing your followee count thus restricting the range of opinions you are exposed to.

Mahoot takes a different approach. The goal is to limit, not maximize, your social media interaction time. The Mahoot algorithm tries to statistically optimize your social interaction within a specified limit. Of course, you can increase the limit anytime you feel like it. The open nature of the Mastodon network allows anyone to implement such an algorithm.

When you use Mahoot, you start by specifying how many posts (or "toots") you wish to view per day *on the average*. On some days you'll view more and on some days less, depending upon how active your followees are each day. Statistics of your feed activity computed over a period (usually 30 days) is used to enforce this "soft" limit.

A basic premise of Mahoot is that if you follow someone, you wish to see at least some of the content they post. We'd like to listen to different voices in the media, but commercial algorithms may promote a louder voice more than a softer voice. Posts by "less popular" users may never be seen even by people who follow them. This often discourages such users from posting at all.

By default, Mahoot will guarantee each of your followees a certain number of views (or impressions) per day, known as the *Mahoot Number*. The default Mahoot Number will be typically larger than the number of desired daily views divided by the number of followees, because not all your followees will post that frequently. Say you follow 150 people and wish to view 300 posts per day, the default Mahoot Number may be 7, rather than 2. (See the [protocol description](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md) for more detail.)

Relying on natural (rather than artificial) intelligence, Mahoot allows you to easily *amp up* (or *amp down*) the Mahoot Number of any followee, to allow more or fewer views per day. You can use this feature to ensure that you always see someone's posts. You can also use it to reduce views of those who post interesting stuff, but too much of it every day. Typically, you will need to adjust the Mahoot number only for a fraction of your followees to take control of your feed. Doing that can free up view time that you can use to follow more people and explore different content.

When you amp up a followee, it will boost their own Mahoot Number, but lower the default Mahoot Number because the others will receive a somewhat smaller share of the average daily views. The amped up (or amped down) Mahoot numbers remain private and will not be seen by any of your followees. (You may choose to publicly advertise your default Mahoot number in your Mastodon bio, so that any followee can easily assess how likely you are to see their posts.)

If someone you follow generates less than their Mahoot Number of posts per day, all their posts are guaranteed to appear in your timeline. If they generate more, then Mahoot will display a random subset equalling their Mahoot Number. (There are optional/experimental features under development that will enable either you or the followee to prioritize which of their posts will be displayed.)

Mahoot will also implement a feature where you can curate some posts into digests or "editions" during specific times of the day. For example, you can configure posts from certain followees (or on certain topics) to be collected and displayed in a *Morning Edition* at 9AM and *Evening Edition* at 6PM (say). This feature is still in an early stage of development.


## Using Mahoot

You can try out Mahoot at [https://Mahoot.dev](https://mahoot.dev) using a browser on a computer or a smart phone (there is currently no phone app available). Simply log into a Mastodon instance and start browsing. You can go to the *Settings > Mahoot* menu to see the configuration options. The most important setting is *Average views per day* (see below), which statistically limits your viewing. (The [Mahoot User Guide](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootUserGuide.md) provides more detailed information on different settings.)

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/SettingsBasic.png"
     alt="Curation settings page">
<br>
<em>Curation settings page</em>
</p>

When you start using Mahoot, it will begin to analyze your feed and compute the statistics of the posting behavior of your followees. Initially, Mahoot usually has less than a day's worth of data to analyze but it will slowly accumulate data as you continue to use it. All the statistical data is stored in your browser, not on any server, ensuring privacy. If you use Mahoot from a different browser, it will compute the statistics separately there. (There is a way to manually export and import statistical data between browsers.)

The posting statistics for all your followees are displayed at the bottom of the *Settings > Curation* page, sorted in descending order of posts per day (as shown in the example below). It may take a few minutes for the statistics to appear initially. You can *amp up* (or *amp down*) a followee by clicking on the Faucet icon on the left. You can also directly amp up/down any followee by clicking the Faucet icon that appears at the bottom of every post you read in your timeline.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootStatistics1.png"
     alt="Mahoot statistics at bottom of Curation page">
<br>
<em>Mahoot statistics at the bottom of the Settings/Curation page. The number of posts (per day) made by each followee, the percentage of those posts displayed in your feed, and the followee amp factor are shown. (User names have been anonymized.)</em>
</p>


Remember that Mahoot is alpha quality software that is being actively developed and may occasionally break. However, that won't break anything else because Mahoot is a standalone Mastodon web client that stores all its data just in your web browser. You can continue to access Mastodon using any other web client or phone app with no interference from Mahoot. You may also choose to switch anytime to the (uncurated) stable version of Pinafore at [Pinafore.social](https://Pinafore.social).

See the [Mahoot User's Guide](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootUserGuide.md) for more information.
For basic information on the Mastodon client features, see the
[Pinafore user guide](https://github.com/nolanlawson/pinafore/blob/master/docs/User-Guide.md). See the [admin guide](https://github.com/nolanlawson/pinafore/blob/master/docs/Admin-Guide.md) if Pinafore cannot connect to your instance. (*Note: Currently Mahoot is only implemented for a single Mastodon instance; it will not work with multiple instances like standard Pinafore.*)


## Why is it called Mahoot?

The name is a combination of Mahout, meaning an elephant trainer, and Toot, as Mastodon posts used to be called. (It's also how a Canadian might pronounce Mahout!)


## Caveat

Pinafore+Mahoot is a "proof of concept" software that works but may fail on corner/edge cases. The goal is not to have everyone switch to using Pinafore+Mahoot, but to demonstrate that the [curation protocol](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md) is useful. This may inspire other Mastodon clients to implement this protocol.


## Authors

Pinafore is developed by [Nolan Lawson](https://github.com/nolanlawson)

Mahoot modifications to Pinafore were added by [R. Saravanan](https://github.com/mitotic) ([@RSarava@Fediscience.org](https://fediscience.org/@RSarava) on Mastodon). Note that these modifications could have introduced new bugs — please don't blame them on Pinafore!


## Running it yourself

Instead of using the [Mahoot.dev](https://mahoot.dev) website, you can also download the Mahoot [source code](https://github.com/mitotic/pinafore-mahoot) and run it on your desktop or laptop computer following the instructions below. (Pinafore [Github](https://github.com/nolanlawson/pinafore) has some additional info for developers.)

Pinafore/Mahoot requires [Node.js](https://nodejs.org/en/) and [Yarn](https://yarnpkg.com). After you have installed them, download Mahoot from Github:

    git clone https://github.com/mitotic/pinafore-mahoot

To build Mahoot for production, first install dependencies (in the ``pinafore-mahoot`` folder):

    yarn --production --pure-lockfile

Then build:

    yarn build

Then run:

    PORT=4002 node server.js

Use http://localhost:4002 to access Mahoot on your browser

