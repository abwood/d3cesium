import urllib2
import json
import os
import csv
import time

nameOverrides = {
    "Congo, Dem. Rep." : "Democratic Republic of Congo",
    "Congo, Rep." : "Republic of Congo",
    "West Bank and Gaza" : "West Bank",
    "Yemen, Rep." : "Yemen",
    "Macedonia, FYR" : "Macedonia",
    "Korea, Dem. Rep." : "North Korea",
    "Korea, Rep." : "South Korea",
    "Micronesia, Fed. Sts." : "Micronesia"
    }

indexOverrides = {
    "Mayotte" : 1,
    "Reunion" : 1,
    "French Guiana" : 1
    }

if __name__ == "__main__":
    fin = open("nations.json", "r")
    countriesJson = json.load(fin)
    fin.close()

    for country in countriesJson:
        #print country["name"]

        # some of the country names in the raw dataset are hard to geocode
        # provide an opportunity to manually override these country names for easier geocoding
        if nameOverrides.has_key(country["name"]):
            url = 'http://nominatim.openstreetmap.org/search?format=json&q=%s' % (nameOverrides[country["name"]])
        else:
            url = 'http://nominatim.openstreetmap.org/search?format=json&country=%s' % (country["name"])

        url = url.replace(" ", "%20")
        response = json.loads(urllib2.urlopen(url).read())

        if len(response) == 0:
            url = 'http://nominatim.openstreetmap.org/search?format=json&q=%s' % (country["name"])
            url = url.replace(" ", "%20")
            response = json.loads(urllib2.urlopen(url).read())

            if len(response) == 0:
                print country["name"]
                continue

        # sometimes the first result from nominatim is incorrect
        # provide an opportunity to manually override the nominatim importance rating
        # by default take the first result (index = 0)
        resultIdx = 0
        if indexOverrides.has_key(country["name"]):
            resultIdx = indexOverrides[country["name"]]

        country["lat"] = float(response[resultIdx]["lat"])
        country["lon"] = float(response[resultIdx]["lon"])

    fout = open('nations_geo.json', 'w')
    json.dump(countriesJson, fout)
    fout.close()
    