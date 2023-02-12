# COMP5347 2022 S1 Assignment 2
## WebDev-16 
eCommerce Web Application Group 16

## Getting Started
Ensure all the required packages are installed

### Prerequisites
* npm
* mongoDB
* nodejs
* Import both phone and user json dataset into local mongoDB 
(Ensure you have mongoDB working by running command "mongod" and use your own file path of demo datasets after --file in the followings)

```
mongoimport --jsonArray --db Phone --collection userlist_demo --file "userlist_demo.json"
```

```
mongoimport --jsonArray --db Phone --collection phonelist_demo --file "phonelisting_demo.json"
```

### Installing
1. Start mongoDB by running 

```
mongod
```

2. Start the web server under controllers folder - Nevigate to the *WebDev-16/app/controllers* folder, run 

```
node ./app.js
```

3. Install the web. Start the web page under views - Nevigate to the *WebDev-16/app/views* folder, run 

```
npm install
```

```
npm run serve
```

### Trouble Shooting

You may use the following command to force install the web app

```
npm install -f
```

## Authors

* **Peilin Ye** 
* **Lei Liao**
* **Tianzhu Yang**
* **Mingcheng Yu**

