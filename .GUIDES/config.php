<?php
unset($CFG);
$CFG = new stdClass();
$CFG->dbtype = "mysqli";
$CFG->dblibrary = "native";
$CFG->dbhost = "mariadb";
$CFG->dbname = "moodle";
$CFG->dbuser = "moodle";
$CFG->dbpass = "medicamentum360_moodle";
$CFG->dbport = "3306";
$CFG->prefix = "mdl_";
$CFG->dboptions = ["dbpersist" => false, "dbsocket" => false, "dbcollation" => "utf8mb4_unicode_ci"];
$CFG->wwwroot = "http://localhost:8090";
$CFG->dataroot = "/var/www/moodledata";
$CFG->admin = "admin";
$CFG->directorypermissions = 02777;
require_once(__DIR__ . "/lib/setup.php");
