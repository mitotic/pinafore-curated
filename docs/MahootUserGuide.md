# Mahoot User Guide

Version 0.3.8

- [Getting started](#getting-started)

- [Basic settings](#basic-settings)

- [Posting statistics](#posting-statistics)

- [Advanced settings](#advanced-settings)

- [Caveats](#caveats)

- [Experimental settings](#experimental-settings)

Mahoot is a working *proof-of-concept* software that implements a curation protocol for the decentralized microblogging network [Mastodon](https://joinmastodon.org). It provides fine-grained control on how you consume Mastodon content.

The curation protocol is implemented within the Pinafore web client. If you are new to Mastodon, read the [Pinafore User Guide](https://github.com/nolanlawson/pinafore/blob/master/docs/User-Guide.md) first. It explains how the web client works.
The [README](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootUserGuide.md) file provides some background on the motivations behind Mahoot. The [protocol document](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md) may also be useful.


## Getting Started

You can try out Mahoot at [https://Mahoot.dev](https://mahoot.dev) using a web browser. There is currently no phone app available, but this client should work fine on a smart phone web browser.

Click on the ``Log in`` button and type the name of your Mastodon instance to login. (*At this time, Mahoot only supports logging into a single Mastodon instance, even though Pinafore supports multiple instances.*)

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/LogInButton.png"
     alt="Mahoot landing page with log in button">
<br>
<em>Landing page</em>
</p>

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/LogInInstance.png"
     alt="Mahoot instance log in page">
<br>
<em>Instance login page</em>
</p>

You will need to give Mahoot/Pinafore permission to access your Mastodon account on the instance, so that you can read, post, and receive notifications. Mahoot is a static web site that stores all its data locally on your browser, not on any server or in the cloud. This ensures privacy and it also means that Mahoot will not interfere with any other Mastodon client that you are currently using. You can continue to use other Mastodon clients, but the Mahoot curation features won't be available there.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/LogInAuth.png"
     alt="Mahoot permissions page">
<br>
<em>Mahoot permissions page</em>
</p>

After you login and give permissions, you will reach the Mastodon Home Timeline. This is your primary feed. Mahoot makes several modifications to your Home Timeline for curation purposes.


## Basic settings

To configure Mahoot, go to the ``Settings`` page:

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/SettingsPage.png"
     alt="Pinafore settings page">
<br>
<em>Pinafore settings page</em>
</p>

Then select ``Mahoot``, which takes you to the curation settings page:

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/SettingsBasic.png"
     alt="Mahoot basic settings page">
<br>
<em>Mahoot basic settings</em>
</p>

The single most important setting for Mahoot is the number of posts you wish to view per day (*on the average*). This number (along with other factors) is used to determine the probability of displaying each post. The screenshot shows a value of 330. Since this is a "soft" limit that is imposed statistically, on days that your followees post more, you will see more than 330 posts displayed. On other days, it will be less than 330.

When you start using Mahoot, it will begin to analyze your feed and compute the statistics of the posting behavior of your followees. Initially, Mahoot usually has less than a day's worth of data to analyze but it will slowly accumulate data as you continue to use it. You can specify the maximum number of *days of data to analyze* in the settings. The default is 30 days.

Another setting is the *low-grade secret key*. Change it to something different from the default value, but the new value doesn't need to be terribly secret or even memorable. Its only purpose is to uniquely seed the [random number generator](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md#probabilistic-post-selection) used to compute the probability of displaying posts.

The final basic setting is *disable curation*. Use it if you encounter buggy behavior and wish to temporarily disable the Mahoot curation extensions to the Pinafore client.

For settings involving numbers or text, click the *Update* button to save the changes (see below). Checkbox settings take effect immediately, but you may need to reload the web page for some changes to become visible.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/UpdateButton.png"
     alt="Mahoot update button">
<br>
<em>Update button</em>
</p>


## Posting statistics


<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootStatistics1.png"
     alt="Mahoot posting statistics">
<br>
<em>Mahoot posting statistics (user names have been anonymized)</em>
</p>


The posting statistics are displayed at the bottom of the *Settings > Curation* page, sorted in descending order of posts per day (as shown in the example above). (*Note*: When you first start using Mahoot, it may take a few minutes for the statistics to appear.)

By default, Mahoot will guarantee each of your followees a certain number of views (or impressions) per day, known as the *Mahoot Number*. The default Mahoot Number is displayed in the statistics section. It will be typically larger than the number of desired daily views divided by the number of followees, because not all your followees will post that frequently. In the above example, the default Mahoot number is 10 for 123 followees sharing an average of 330 views per day.

The posting statistics for all your followees are displayed in the statistics section, sorted in descending order of posts per day. For each followee, their Mastodon username, average posts per day, post view probability, view amplification factor, and the full name are shown. The amplification factor can be used to allocate more views to a followee. The default amplification factor is 1, but you can increase it or decrease it. Click on the faucet icon on the left to display a pop up menu for any followee.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootUsers.png"
     alt="Popup information for 3 Mahoot users">
<br>
<em>Popup windows showing statistics for the most actively posting followees #2-4. Left user has default amp value. Middle user has been amped down to have half the default Mahoot number, and the right one has been amped up to double the default number. Total posts per day for each followee is shown as the sum of prioritized ("hashtagged") posts plus other posts and reblogs (see Experimental Settings section below). Separate view probabilities are also shown for these two types of posts.</em>
</p>

The popup menu allows you to *amp up* (or *amp down*) a followee, i.e. double or halve their Mahoot number. You can use this feature to amp up your colleagues so that you never miss any of their posts. You can also use it to amp down those who post interesting stuff, but just a bit too much of it every day. Amping up an active followee can lower the default Mahoot number, as all the others followees will get a smaller share of the daily views. (You can increase the daily average limit to compensate for that.)

Also included in the list is the statistics of your own posts, computed as if you were "following" yourself. You can see how your posting statistics rank compared to those you follow (see below).

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootSelfUser.png"
     alt="Popup information for self user">
<br>
<em>Posting statistics list showing "self" user</em>
</p>

Typically, only a fraction of your followees will need to have their amplifaction factors adjusted. You can directly amp up/down a followee when you see any of their posts by clicking the Faucet icon that appears at the bottom of the post (see below).

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootToolbar.png"
     alt="Faucet icon in the status toolbar">
<br>
<em>The faucet icon appears in the status toolbar of each post</em>
</p>


## Advanced settings


<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/SettingsAdvanced.png"
     alt="Mahoot advanced settings">
<br>
<em>Mahoot advanced settings</em>
</p>

Mahoot has several additional settings to control the appearance of your home timeline:

- ``Display timestamp/counter for feed``: This displays a timestamp for each older post along with a counter (``hh:mm#nnn``). The counter is reset to zero at midnight local time so that you can see how many posts have appeared on your timeline since then. (See screenshot below.)

- ``Show dropped posts``: By default, Mahoot does not show any posts that are dropped by its probabilistic curation algorithm. Enabling this option will show those posts, de-emphasized by graying them out. This allows you to check how the curation algorithm is working. (*Note: You may need to reload the page for this to take effect.*)

- ``Hide duplicate boosts``: Another experimental option that will hide display of posts that have already been displayed as boosts. (This is a variation of the standard ``Group boosts in timelines`` option in Mastodon Preferences>Other.)

- ``Hide self replies from home timeline``: Another experimental option that hides replies to an original post by the original poster (effectively displaying only the top of a thread).



## Caveats

- If some changes don't seem to take effect or isn't working, *reloading* the web page will help. The experimental ``Show Reply Context`` and ``Digest editions`` features only work after you reload the web page.

- To update to the latest version of Mahoot on the website, a [hard refresh](https://fabricdigital.co.nz/assets/How-to-hard-refresh-browser-infographic.jpg) of the browser is usually needed.

- Remember that Mahoot is alpha quality software that is being actively developed and may occasionally break. However, that won't break anything else because Mahoot is a standalone Mastodon web client that stores all its data just in your web browser. You can continue to access Mastodon using any other web client or phone app with no interference from Mahoot. You may also choose to switch anytime to the (uncurated) stable version of Pinafore at [Pinafore.social](https://Pinafore.social).

- Pinafore+Mahoot is a working "proof of concept" software. The goal is not to have everyone switch to using Pinafore+Mahoot, but to demonstrate that the [curation protocol](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md) is useful. This may inspire other Mastodon clients to also implement this protocol.


## Experimental settings

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/SettingsExperimental.png"
     alt="Mahoot experimental settings">
<br>
<em>Mahoot experimental features</em>
</p>

Mahoot has several experimental features which are in various stages of development. These features are unpolished/incomplete and may change/break easily. Some of these features, like [Digest editions](#digest-editions), will work even without others using the Mahoot protocol. Other features, like [periodic/prioritized](#periodic-posts-message-of-the-dayweekmonth) posts, will work only if your followees also use the Mahoot protocol and insert the appropriate hashtags.

### Experimental options

- ``Show dev menus``: Show additional (undocumented) information in popup menus for development purposes

- ``Anonymize usernames``: Makes it easy to share screenshots of posting statistics

- ``Amplify high boosts``: This is an experimental option that increases the probability that highly boosted posts will be displayed. (This may cause the daily view limit to be exceeded.)

- ``Show reply context``: Oftentimes viewing the boosted reply to a post doesn't make much sense if you haven't seen (or don't recall) the original post. This experimental option will attempt to show the original post  below the reply to provide context, provided the original post is somewhere in your feed. This usually requires that the original post is either authored or alreaded boosted by one of your followees.  See screenshot below for an example. (*Note: At this time, this option only takes effect after you reload the web page.*)

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/ShowReplyContext.png"
     alt="Mahoot show replay context example">
<br>
<em>Mahoot Show Reply Context example. The thicker left border highlights the reply and context, with context being dimmed. You can also see the timestamp/counter indicating the reply is the 77th post of the day on the home timeline displayed at 8:08AM
</em>
</p>

### Digest editions

This feature is inspired by newspapers, where you get information every morning from reporters and columnists, nicely organized into sections like Politics, Sports, Opinion etc. Treating some of your followees as columnists, this features allowes you to digest their posts into different sections and view them at the same time, like an edition of the newspaper.

You don't have to wait a whole day to read a new digest edition in your feed. As shown in the Experimental settings menu above, you can schedule one or more local times (``hh:mm``) when you wish to display digests or "editions" of selected posts from your timeline. For example, you can choose to have a *Morning Edition* displayed at 08:00. At this time, you can specify a list of user handles in the text area below. All posts from the specified users will be collected and displayed in the next "edition" (excluding posts that are dropped by the Mahoot algorithm). You can append a hashtag to the user handle to create sections within each edition, as shown in the screenshot below. More sophisticated ways to create editions will come later.

*Note*: At this time, you will need to refresh the web page to see the most recent edition.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootEdition1.png"
     alt="Mahoot edition example">
<br>
<em>Mahoot edition example</em>
</p>


### Periodic posts (message of the day/week/month)

Mahoot is designed to help even low-volume posters to reliably get their message across to their followers. For example, if you are a reporter who posts a daily news update or a blogger who posts weekly, simply adding a hashtag will prioritize your post: add ``#MOTD`` (Message Of The Day) to your daily post, ``#MOTW`` to your weekly post, or ``#MOTM`` to your monthly post. Periodic posts are automatically given the highest priority and displayed in the Digest/Edition format. (You can insert ``#NoDigest`` to override this.) 

*Note 1*: Mahoot tracks usage of periodic tags: e.g., if you post more than one ``#MOTD`` message per day, only one of them&mdash;randomly chosen&mdash;will receive the special treatment. If you post using Mahoot, it will also warn you about overuse of periodic tags. If a followees Mahoot number falls below 1 post/day, their ``#MOTD`` posts lose their priority. (To hide weekly or monthly posts, you will need to mute or unfollow the user.)

*Note 2*: The definition "a day" for periodic posts should ideally depend upon which timezone the followee is normally active in. Since Mahoot doesn't know the followee's timezone, it uses UTC time by default to define when the day/week/month starts. A followee can let Mahoot know of their preferred timezone by adding some text to their Mastodon profile that indicates the ``TZ``  parameter value, using the standard *Continent/City* format. (See screenshot below.)

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootProfile.png"
     alt="Mahoot profile text example">
<br>
<em>Portion of the followee Mastodon profile showing Mahoot-related info: Topics, Timezone, and Mahoot (number) </em>
</p>



### Prioritized posts

Mahoot distinguishes between prioritized posts and regular posts when it computes the statistical probability of displaying a post (see the popup screenshots in the [Posting Statistics](#posting-statistics) section). The views available to a followee (i.e., the Mahoot number) are [first allocated](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md#post-prioritization) to priority posts. Any remaining views are allocated to regular posts. At this time, Mahoot assumes by default that a post (not reblog) by the followee that includes any hashtag is a priority post. To specify that only certain hashtags should indicate priority, a followee can add a ``Topics`` parameter to their Mastodon profile with a list of hashtags (see screenshot above). (This is an experimental feature and other customization options will be explored.)

*Note*: As noted previously, periodic posts automatically receive the highest priority.
