module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: [
          'src/inject/utils.js'
          , 'src/inject/matcher.js'
          , 'src/inject/drafts.js'
          , 'src/inject/notes.js'
          , 'src/inject/html.js'
          , 'src/inject/stopwatch.js'
          , 'src/inject/restfulcalls.js'
          , 'src/inject/refactorings.js'
          , 'src/inject/heuristics.js'
          , 'src/inject/vesperize.js'
          , 'src/inject/violette.js'
        ],
        dest: 'lib/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'lib/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');

  grunt.registerTask('default', ['concat', 'uglify']);

};