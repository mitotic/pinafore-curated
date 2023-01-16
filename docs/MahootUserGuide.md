# Mahoot User Guide

Version 0.4.0

- [Getting started](#getting-started)

- [Basic settings](#basic-settings)

- [Following hashtags](#following-hashtags)

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

After you login and give permissions, you will reach the Mastodon Home Timeline (shown below). This is your primary feed. Mahoot makes several modifications to the feed your Home Timeline for curation purposes. At the top right corner of this page, it shows some summary curation info.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootHomeTimeline.png"
     alt="Mahoot home timeline">
<br>
<em>Mahoot Home Timeline showing curation statistics at the top right corner: The average number posts received daily in the timeline (left) and the number that are actually displayed after curation (right)</em>
</p>

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

The only basic setting for Mahoot is the number of posts you wish to view per day (*on the average*). This number (along with other factors) is used to determine the probability of displaying each post. The screenshot shows a value of 330. Since this is a "soft" limit that is imposed statistically, on days that your followees post more, you will see more than 330 posts displayed. On other days, it will be less than 330.

For settings like this involving numbers or text, click the *Update* button further down to save the changes. (Checkbox settings take effect immediately, but you may need to reload the web page for some changes to become visible.)

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/UpdateButton.png"
     alt="Mahoot update button">
<br>
<em>Update button</em>
</p>

## Following hashtags

Mastodon allows you to follow hashtags (like ``#climatechange``) just like you follow users. Mahoot also allows you to curate posts with followed hashtags in the same manner as posts from followed users. This can be very useful because following a popular hashtag can direct a firehose of posts to your feed.

To follow a hashtag, use the search menu from the top bar and type the hashtag you wish to follow:

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/HashTagSearch.png"
     alt="Searching for hashtag climate change">
<br>
<em>Search for hashtag</em>
</p>

Then select the hashtag from the search results to go to the hashtag page. The button near the top of the page allows you follow/unfollow the hashtag.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/HashTagFollow.png"
     alt="Hashtag page for climate change showing follow/unfollow button">
<br>
<em>Follow/unfollow hashtag</em>
</p>

## Posting statistics


<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootStatistics1.png"
     alt="Mahoot posting statistics">
<br>
<em>Mahoot posting statistics (user names have been anonymized)</em>
</p>


The posting statistics are displayed at the bottom of the *Settings > Curation* page, sorted in descending order of posts per day (as shown in the example above). (*Note*: When you first start using Mahoot, it may take a few minutes for the statistics to appear.)

By default, Mahoot will guarantee each of your followees a certain number of views (or impressions) per day, known as the *Mahoot Number*. The default Mahoot Number is displayed in the statistics section. It will be typically larger than the number of desired daily views divided by the number of followees, because not all your followees will post that frequently. In the above example, the default Mahoot number is 13.3 for 130 followees sharing an average of 330 views per day.

The posting statistics for all your followees are displayed in the statistics section, sorted in descending order of posts per day. For each followee, their Mastodon username, average posts per day, post view probability, view amplification factor, and the full name are shown. The amplification factor can be used to allocate more views to a followee. The default amplification factor is 1, but you can increase it or decrease it. Click on the faucet icon on the left to display a pop up menu for any followee. Note that followed hashtags (like ``#climatechange`` above) are curated just like a followed user.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootUsers.png"
     alt="Popup information for 3 Mahoot users">
<br>
<em>Popup windows showing statistics for the most actively posting followees #1-3. The top user, <tt>#climatechange</tt>, has an amp value of 2 and therefore has double the default Mahoot number. User #2 has been amped down to have half the default Mahoot number, and user #3 has the default number. Total posts per day for each followee is shown as the sum of prioritized ("hashtagged") posts plus other posts and reblogs (see Experimental Settings section below). Separate view probabilities are also shown for these two types of posts.</em>
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

- ``Display timestamp/counter for feed``: This displays a timestamp for each post along with a counter (``hh:mm#nnn``) for older posts. The counter is reset to zero at midnight local time so that you can easily track how many posts have appeared in your timeline since then. (See screenshot for the ``Show Replay Context`` experimental option below; the counter will not appear for recent posts because Mahoot collates posts periodically, about every two hours.)

- ``Show dropped posts``: By default, Mahoot does not show any posts that are dropped by its probabilistic curation algorithm. Enabling this option will show those posts, de-emphasized by graying them out. Clicking on the faucet icon will tell you why the post was dropped. This allows you to check how the curation algorithm is working. (*Note: You may need to reload the page for this option to take effect.*)

- ``Hide self replies from home timeline``: Another experimental option that hides replies to an original post by the original poster (effectively displaying only the top of a thread).

- ``Hide duplicate boosts``: Another experimental option that will hide display of posts that have already been displayed as boosts. (This is a variation of the standard ``Group boosts in timelines`` option in Mastodon Preferences>Other.)

- ``Disable curation``: Use this setting if you encounter buggy behavior and wish to temporarily disable the Mahoot curation extensions to the Pinafore client.

- ``Days of data to analyze``: When you start using Mahoot, it will begin to analyze your feed and compute the statistics of the posting behavior of your followees. Initially, Mahoot usually has less than a day's worth of data to analyze but it will slowly accumulate data as you continue to use it. This setting allows you to specify the maximum number of days to analyze. The default is 30 days. (This setting is capped at 60 days to avoid computational overload.)

- ``Seed string for randomization``: Mahoot generates "random" numbers to [select which posts to display](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md#probabilistic-post-selection). These "random" numbers depend upon the serial (id) number of each post and a string value ("seed") which is set to "default" initially. You can change the seed to a different value if you think a rogue Mastodon server might adjust the serial numbers of posts to control the random numbers (an unlikely scenario). (Whatever the seed value, it should be the same across all your Mastodon clients to ensure that the same random subset of posts is displayed.)

## Caveats

- If a change in the Mahoot settings doesn't seem to be having any visible effect, *reloading* the web page may help.

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


### Reply context

Oftentimes viewing the boosted reply to a post doesn't make much sense if you haven't seen (or don't recall) the original post. The ``Show reply context`` experimental option will attempt to show the original post below the reply to provide context, if the original post is available from your Mastodon server. See screenshot below for an example.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/ShowReplyContext.png"
     alt="Mahoot show replay context example">
<br>
<em>Mahoot Show Reply Context example. The thicker left border highlights the reply and context, with context being dimmed. You can also see the timestamp/counter indicating the reply is the 77th post of the day on the home timeline displayed at 8:08AM
</em>
</p>


### Digest editions

This feature is inspired by newspapers, where you get information every morning from reporters and columnists, nicely organized into sections like Politics, Sports, Opinion etc. Treating some of your followees as columnists, this features allowes you to digest their posts into different sections and view them at the same time, like an edition of the newspaper.

You don't have to wait a whole day to read a new digest edition in your feed. The ``Digest edition time(s)`` option (see Experimental settings above) allows you to schedule one or more local times (``hh:mm``) when you wish to display digests or "editions" of selected posts from your timeline. For example, you can choose to have a *Morning Edition* displayed at 08:00 and an *Afternoon edition* at 15:00.

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootEdition1.png"
     alt="Mahoot edition example">
<br>
<em>Mahoot simple edition example.</em>
</p>

The ``Digest edition layout`` option allows you to specify a (comma/space-separated) list of usernames whose posts will be automatically digested and displayed in the next "edition" (excluding posts that are dropped by the Mahoot algorithm). You can append a hashtag to the username to indicate that only those posts with that hashtag will be included in the digest. You can also specify ``*SectionName`` to indicate the start of a named section of the edition, followed by a list of usernames for that section. Here's a sample edition layout:

    user1, blogger@server2#motx, ...
    *News
    journal@server3, reporter@server4#politics, ...
    *Science
    columnist@server5#motx, scientist@server6#climate, #climatechange, ...
    *Opinion
    pundit@server7, opinionated@server8, ...

- Note 1: Empty editions will appear as just a thick line
- Note 2: For users on your Mastodon server, ``@server`` should be omitted from the username
- Note 3: Suffix ``#motx`` indicates all periodic posts from the user should be inlcuded in the edition, as explained below
- Note 4: Plain hashtag ``#climatechange`` indicates all non-dropped and non-reply posts on the topic should be included in the edition (assuming you are following ``#climatechange``)

Editions can be considered as a single-feed alternative to Mastodon Lists. More sophisticated ways to format editions can be expected in the future.

### Periodic posts (message of the day/week/month)

Mahoot is designed to help even low-volume posters to reliably get their message across to their followers. For example, if you are a reporter who posts a daily news update or a blogger who posts weekly, simply adding a hashtag will prioritize your post: add ``#MOTD`` (Message Of The Day) to your daily post, ``#MOTW`` to your weekly post, or ``#MOTM`` to your monthly post. Periodic posts are automatically given the highest priority. You can add ``#Digest`` to include periodic posts in the next Digest Edition.

*Note 1*: Mahoot tracks usage of periodic tags: e.g., if you post more than one ``#MOTD`` message per day, only one of them&mdash;randomly chosen&mdash;will receive the special treatment. If you post using Mahoot, it will also warn you about overuse of periodic tags. If a followees Mahoot number falls below 1 post/day, their ``#MOTD`` posts lose their priority. (To hide weekly or monthly posts, you will need to mute or unfollow the user.)

*Note 2*: The definition "a day" for periodic posts should ideally depend upon which timezone the followee is normally active in. Since Mahoot doesn't know the followee's timezone, it uses UTC time by default to define when the day/week/month starts. A followee can let Mahoot know of their preferred timezone by adding some text to their Mastodon profile that indicates the ``TZ``  parameter value, using the standard *Continent/City* format. (See screenshot below.)

<p align="center">
<img src="https://raw.githubusercontent.com/mitotic/pinafore-mahoot/master/docs/images/MahootProfile.png"
     alt="Mahoot profile text example">
<br>
<em>Portion of the followee Mastodon profile showing Mahoot-related info: Topics, Timezone, and Mahoot (number) </em>
</p>

### Prioritized posts

Mahoot probabilistically drops posts from followees. This works fine if all their posts are equally important, which is not always the case. Therefore, Mahoot supports [a mechanism to prioritize posts](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootProtocol.md#post-prioritization). Different dropping probabilities are computed for prioritized posts versus regular posts (see the popup screenshots in the [Posting Statistics](#posting-statistics) section). The views available to a followee (i.e., the Mahoot number) are first allocated to priority posts. Any remaining views are allocated to regular posts. (As noted previously, periodic posts automatically receive the highest priority.)

At this time, Mahoot assumes by default that a post (not reblog) by the followee that includes any hashtag is a priority post. To specify that only certain hashtags should receive priority handling, a followee can add a ``Topics`` parameter to their Mastodon profile with a list of hashtags (see screenshot above). This will result in "off-topic" posts not being prioritized. Hashtag #priority can be used to override  this. (This is an experimental feature and other customization options will be explored.)

*Note*: One can consider prioritizing posts based on their content, their popularity etc., as commercial curating algorithms typically do. However, this is hard to do on the client side due to the limited information available to a single client (or even a single decentralized server). For example, the boost count obtained from a decentralized server may not always be reliable. In any case, the goals of commercial curation algorithms may not be optimal for you and the results may not be very satifying. Mahoot relies upon your followees to do the curation for you, and for you to do the curation for your followers. That being said,  the ``Amplify high boosts`` option described below is a baby step in the direction of trying to use "popularity" to prioritize posts. 


### Other experimental options

- ``Amplify high boosts``: This is an experimental option that increases the display probability of highly boosted posts, using a followee-specific threshold based on the logarithmic average of the boost counts of their reblogs. If you have enabled the timestamp/counter option, the suffix ``HB`` will appear on the label to indicate these high boosts. (This option may cause the daily view limit to be exceeded.)

- ``Anonymize usernames``: This option facilitates the sharing of screenshots that show user statistics

- ``Show dev menus``: Show additional (undocumented) menus and other information for developers. One "dev" feature that can be useful is ``Erase recent curation data``. It erases curation data for the last 12 hours. Wait for about 30 seconds after you erase and then click the ``Reload`` button next to it. Mahoot will retrieve all the recent posts again from the server. This will allow changes in Mahoot settings, such as Digest Edition specifications, to take effect from 12 hours prior and show up in your timeline.

