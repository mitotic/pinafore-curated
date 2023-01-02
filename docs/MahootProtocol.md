# Mahoot Protocol

R. Saravanan ([@RSarava@fediscience.org](https://fediscience.org/@RSarava)), 30 Dec 2022

*The code implementing this protocol can be found in primarily in these two files on Github: [curationStats.js](https://github.com/mitotic/pinafore-mahoot/blob/master/src/routes/_curation/curationStats.js), [curationFilter.js](https://github.com/mitotic/pinafore-mahoot/blob/master/src/routes/_curation/curationFilter.js)*

The Mahoot protocol probabilistically selects a subset of posts from an user's followees to display in the timeline. To do that, Mahoot saves metadata for posts over an averaging period (default: 30 days) to compute the posting statistics for each followee. The user specifies the average number of total posts that they wish to view per day, V. We need to compute the *default Mahoot number* M<sub>def</sub>, which is the maximum number of views allowed per followee.

Say the average number of total posts from the followees is P<sub>tot</sub>. If P<sub>tot</sub> &lt; V, then all posts can be viewed. In this case, M<sub>def</sub> is set to P<sub>max</sub>, where P<sub>max</sub> is number posts per day from your most prolific followee.

Otherwise, some posts will need to be dropped. Consider the unweighted case where all followees are treated equally. To compute M<sub>def</sub>, sort the followees by the number of posts per day, P<sub>user</sub>, in ascending order. The number of available daily views is V. Start from the least active followee and allocate P<sub>user</sub> views to each. Divide the remaining views by the remaining number of followees to estimate the Mahoot number. This estimate will keep increasing for a while, because the least active followers are "below average" consumers of views. When the estimate stops increasing, that maximum value is the default Mahoot number M<sub>def</sub>. Every followee is allowed up to M<sub>def</sub> views per day.

We can treat the followees differentially by assigning an *amplification factor* F<sub>user</sub> to each followee. You can then estimate M<sub>def</sub> using the same method&mdash;by pretending that an F<sub>user</sub> value of 2 means that followee is effectively two followees and so on. The user-specific Mahoot number M<sub>user</sub> is M<sub>def</sub> times the amplification factor, F<sub>user</sub>. 

For followees who post less than their M<sub>user</sub> value, the probability of viewing their post is 1. For followees who post more than their M<sub>user</sub> value, the probability of viewing their post is M<sub>user</sub> / P<sub>user</sub>, where P<sub>user</sub> is their daily posting rate.

## Post prioritization

Posts can be [prioritized](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootUserGuide.md#prioritized-posts) so that "more important" posts are more likely to be displayed. If the number of (daily) prioritized posts by a user is Q<sub>user</sub>:

- if Q<sub>user</sub> &lt; M<sub>user</sub> then all their prioritized posts are displayed and the remaining (unprioritized) posts are displayed with probability (M<sub>user</sub> - Q<sub>user</sub>) / (P<sub>user</sub> - Q<sub>user</sub>)

- if Q<sub>user</sub> &ge; M<sub>user</sub>, then only the prioritized posts are displayed with probability M<sub>user</sub> / Q<sub>user</sub>

Mahoot extends this approach further to implement three levels of prioritization, with [periodic posts](https://github.com/mitotic/pinafore-mahoot/blob/master/docs/MahootUserGuide.md#periodic-posts-message-of-the-dayweekmonth) getting the highest priority.

## Post display consistency

A probabilistic curation protocol should be consistent, i.e., it should select the same subset of posts to display regardless of which Mastodon client is used. If you recall seeing a recent post on your phone but aren't able to see it on your laptop, it would be annoying. To achieve display consistency, Mahoot relies on the [unique ID](https://shkspr.mobi/blog/2022/12/snowflake-ids-in-mastodon-and-unique-ids-in-the-fediverse-more-generally/) that is associated with each Mastodon post. The unique ID essentially serves as the seed for a random number generator using an algorithm called [HMAC](https://www.stat.berkeley.edu/~stark/Java/Html/sha256Rand.htm). The value of the HMAC random number is used to determine whether a particular post should be displayed in your timeline.

In principle, a followee running their own Mastodon server could adjust the unique ID of a post so that a specific follower will always see it (because they can iterate with the random number generator). To prevent that, the HMAC algorithm uses a secret key that is unique to each user. A user will see the same subset of posts displayed on any client provided they use the same HMAC key.