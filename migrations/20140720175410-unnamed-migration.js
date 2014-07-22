module.exports = {
  up: function(migration, DataTypes, done) {
    // add altering commands here, calling 'done' when finished
	  migration.addColumn('Media', 'resolution', DataTypes.STRING);
	  migration.addColumn('Media', 'size', DataTypes.FLOAT);
	  migration.addColumn('Media', 'group', DataTypes.STRING);
	  migration.addColumn('Media', 'variation_of_id', DataTypes.INTEGER);

	  done();
  },
  down: function(migration, DataTypes, done) {
    // add reverting commands here, calling 'done' when finished
    done()
  }
}
