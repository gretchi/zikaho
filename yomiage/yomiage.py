#!/usr/bin/env python3

import pyttsx3
engine = pyttsx3.init()

engine.setProperty("rate", 150)
engine.setProperty("volume", 1.0)

engine.say("There is a fire! There is a fire! A fire has started on the first floor. Please evacuate in an orderly fashion.")
engine.runAndWait()
