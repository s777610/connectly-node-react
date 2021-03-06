const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const passport = require("passport");
const axios = require("axios");

const keys = require("../../config/keys");

// Load Validation
const validateProfileInput = require("../../validation/profile");
const validateExperienceInput = require("../../validation/experience");
const validateEducationInput = require("../../validation/education");

// Load Profile Model
const Profile = require("../../models/Profile");
// Load User Model
const User = require("../../models/User");

// @route   GET api/profile/test
// @desc    Test profile route
// @access  Public
router.get("/test", (req, res) => res.json({ msg: "Profile Works" }));

// @route   GET api/profile
// @desc    Get current users profile
// @access  Private
router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const errors = {};
    Profile.findOne({ user: req.user.id })
      .populate("user", ["name", "avatar"]) // because ProfileSchema has ref: "users"
      .then(profile => {
        if (!profile) {
          errors.noprofile = "There is no profile for this user";
          return res.status(404).json(errors);
        }
        res.json(profile);
      })
      .catch(err => res.status(404).json(err));
  }
);

// @route   GET api/profile/all
// @desc    Get all profile
// @access  Public
router.get("/all", (req, res) => {
  const errors = {};
  Profile.find()
    .populate("user", ["name", "avatar"])
    .then(profiles => {
      if (!profiles) {
        errors.noprofile = "There are no profiles";
        return res.status(404).json(errors);
      }
      res.json(profiles);
    })
    .catch(err => res.status(404).json({ profile: "There are no profiles" }));
});

// @route   GET api/profile/handle/:handle
// @desc    Get profile by handle
// @access  Public
router.get("/handle/:handle", (req, res) => {
  const errors = {};
  Profile.findOne({ handle: req.params.handle }) // get handle from URL
    .populate("user", ["name", "avatar"])
    .then(profile => {
      if (!profile) {
        errors.noprofile = "There is no profile for this user";
        res.status(404).json(errors);
      }
      res.json(profile);
    })
    .catch(err => res.status(404).json(err));
});

// @route   GET api/profile/user/:user_id
// @desc    Get profile by user ID
// @access  Public
router.get("/user/:user_id", (req, res) => {
  const errors = {};

  Profile.findOne({ user: req.params.user_id }) // get user_id from URL
    .populate("user", ["name", "avatar"])
    .then(profile => {
      if (!profile) {
        errors.noprofile = "There is no profile for this user";
        res.status(404).json(errors);
      }
      res.json(profile);
    })
    .catch(err =>
      res.status(404).json({ profile: "There is no profile for this user" })
    );
});

// @route   POST api/profile
// @desc    Create or Edit user profile
// @access  Private
router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validateProfileInput(req.body);
    // Check Validation
    if (!isValid) {
      // Return any errors with 400 status
      return res.status(400).json(errors);
    }

    const {
      skills,
      youtube,
      twitter,
      facebook,
      linkedin,
      instagram
    } = req.body;

    const profileFields = {
      ...req.body,
      user: req.user.id,
      skills: skills.split(","),
      social: { youtube, twitter, facebook, linkedin, instagram }
    };

    Profile.findOne({ user: req.user.id }).then(profile => {
      if (profile) {
        // Update
        Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        ).then(profile => res.json(profile));
      } else {
        // Create
        // Check if handle exists
        Profile.findOne({ handle: profileFields.handle }).then(profile => {
          if (profile) {
            errors.handle = "That handle already exists";
            res.status(400).json(errors);
          }

          // Create and Save Profile
          new Profile(profileFields).save().then(profile => res.json(profile));
        });
      }
    });
  }
);

// @route   POST api/profile/experience
// @desc    Add experience to profile
// @access  Private
router.post(
  "/experience",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validateExperienceInput(req.body);
    // Check Validation
    if (!isValid) {
      // Return any errors with 400 status
      return res.status(400).json(errors);
    }

    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description
    } = req.body;

    Profile.findOne({ user: req.user.id }).then(profile => {
      // or const newExp = {...req.body,}
      const newExp = {
        title,
        company,
        location,
        from,
        to,
        current,
        description
      };

      // Add to exp array
      profile.experience.unshift(newExp); // add newExp in beginng

      profile.save().then(profile => res.json(profile));
    });
  }
);

// @route   POST api/profile/education
// @desc    Add education to profile
// @access  Private
router.post(
  "/education",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const { errors, isValid } = validateEducationInput(req.body);
    // Check Validation
    if (!isValid) {
      // Return any errors with 400 status
      return res.status(400).json(errors);
    }

    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description
    } = req.body;

    Profile.findOne({ user: req.user.id }).then(profile => {
      const newEdu = {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
      };

      // Add to exp array
      profile.education.unshift(newEdu); // add newExp in beginng

      profile.save().then(profile => res.json(profile));
    });
  }
);

// @route   DELETE api/profile/experience/:exp_id
// @desc    Delete experience from profile
// @access  Private
router.delete(
  "/experience/:exp_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id })
      .then(profile => {
        // Remove experience
        profile.experience.remove({ _id: req.params.exp_id });
        // Save profile
        profile.save().then(profile => res.json(profile));
      })
      .catch(err => res.status(404).json(err));
  }
);

// @route   DELETE api/profile/education/:edu_id
// @desc    Delete education from profile
// @access  Private
router.delete(
  "/education/:edu_id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id })
      .then(profile => {
        //Remove education
        profile.education.remove({ _id: req.params.edu_id });
        // Save profile
        profile.save().then(profile => res.json(profile));
      })
      .catch(err => res.status(404).json(err));
  }
);

// @route   DELETE api/profile
// @desc    Delete user and profile
// @access  Private
router.delete(
  "/",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Profile.findOneAndRemove({ user: req.user.id }).then(() => {
      User.findOneAndRemove({ _id: req.user.id }).then(() =>
        res.json({ success: true })
      );
    });
  }
);

// @route       GET api/profile/github/:username
// @desc        Get github data from github api
// @access      Public
router.get("/github/:username", (req, res) => {
  const username = req.params.username;
  const clientId = keys.clientId;
  const clientSecret = keys.clientSecret;
  const count = 5;
  const sort = "created: asc";
  let repos;
  axios
    .get(
      `https://api.github.com/users/${username}/repos?per_page=${count}&sort=${sort}&client_id=${clientId}&client_secret=${clientSecret}`
    )
    .then(result => {
      repos = result.data;
      return res.json({ repos });
    })
    .catch(err => console.log(err));
});

module.exports = router;
