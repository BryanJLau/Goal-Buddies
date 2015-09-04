Goal Buddies Web Application
=============
This app is the "web version" of the **in development** Android app, Goal Buddies. 
It will feature:

- The most current list of goals and all appropriate features
- Social features such as friendships
- Statistical information regarding your goal activity

Timeline
=============
The following items are subject to change, and are not in any particular order:

- [x] Setup to run on [OpenShift](http://v2-goalbuddies.rhcloud.com)
- [x] Schema development
- [ ] Goal object
  - [x] CRUD
  - [ ] List with filter/search
  - [ ] Priority calculation algorithm
  - [x] Front-end
- [ ] User object
  - [ ] CRUD
  - [x] Login/registration
  - [ ] Public/private profile
  - [ ] Statistics collection
  - [ ] "News feed" for self and friends
  - [ ] Front-end
- [ ] Relationship
  - [ ] CRUD
- [ ] Additional features
  - [x] RESTful API prototype
  - [ ] Premium features (follow)
  - [ ] Social media integration

Proposed API
=============
See [API](API.md)

Warning / Disclaimer
=============
Data stored in the web app may be deleted at any moment as the schema is 
developed.

Database Transactions
=============
Because of the MEAN stack, there are no transactions. While two-phase 
commits are available, they are neither guaranteed nor convenient, so 
the database may be in an illegal state. However, the database will 
attempt to readjust itself if possible on server start.

Security
=============
Security is attempted, but not guaranteed, so be prudent with sensitive 
information.
