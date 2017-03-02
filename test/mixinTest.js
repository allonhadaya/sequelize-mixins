const { assert } = require('chai');

const Sequelize = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: ':memory:'
});

describe('Model.prototype.mixin', () => {

  describe('before calling config', () => {

    it('should not exist before calling config', () => {

      const m = sequelize.define('m', {});
      assert.notProperty(m, 'mixin');
    });
  });

  describe('after calling config', () => {

    before(() => {
      require('../mixin').config();
    });

    beforeEach(() => {
      sequelize.drop();
    });

    it('should exist', () => {

      const m = sequelize.define('m', {});
      assert.property(m, 'mixin');
    });

    it('should throw an error when attribute does not exist', () => {

      assert.throws(() => {
        sequelize.define('user', {
          // nothing
        }).mixin('doesNotExist', { });
      });
    });

    it('should throw an error when attribute is not an ENUM', () => {

      assert.throws(() => {
        sequelize.define('user', {
          role: Sequelize.STRING
        }).mixin('role', {
          admin: { methodA() {} }
        });
      });

    });

    it('should throw an error when implementations are missing', () => {

      assert.throws(() => {
        sequelize.define('user', {
          role: {
            type: Sequelize.ENUM,
            values: ['admin', 'valueNotImplemented']
          }
        }).mixin('role', {
          admin: { methodA() {} }
        });
      });
    });

    it('should throw an error when implementations have different methods', () => {

      assert.throws(() => {
        sequelize.define('user', {
          role: {
            type: Sequelize.ENUM,
            values: ['admin', 'normal']
          }
        }).mixin('role', {
          admin: { methodA() {} }, // missing methodB
          normal: { methodA() {}, methodB() {} }
        });
      });
    });

    it('should support a single implementation', () => {

      const User = sequelize.define('user', {
        role: {
          type: Sequelize.ENUM,
          values: ['admin']
        }
      }).mixin('role', {
        admin: {
          methodA() {},
          methodB() {}
        }
      });

      return User.sync()
        .then(() => User.create({ role: 'admin' }))
        .then(created => {
          assert.property(created, 'methodA');
          assert.property(created, 'methodB');
        })
        .then(() => User.findOne())
        .then(found => {
          assert.property(found, 'methodA');
          assert.property(found, 'methodB');
        });
    });

    it('should support multiple implementations', () => {

      function adminA() {}
      function adminB() {}
      function normalA() {}
      function normalB() {}

      const User = sequelize.define('user', {
        role: {
          type: Sequelize.ENUM,
          values: ['admin', 'normal']
        }
      }).mixin('role', {
        admin: { methodA: adminA, methodB: adminB },
        normal: { methodA: normalA, methodB: normalB }
      });

      return User.sync()
        .then(() => Sequelize.Promise.all([
          User.create({ role: 'admin' }),
          User.create({ role: 'normal' })
        ]))
        .then(([createdAdmin, createdNormal]) => {
          assert.equal(createdAdmin.methodA, adminA);
          assert.equal(createdAdmin.methodB, adminB);
          assert.equal(createdNormal.methodA, normalA);
          assert.equal(createdNormal.methodB, normalB);
        })
        .then(() => User.findAll({ orderBy: 'role' }))
        .then(([foundAdmin, foundNormal]) => {
          assert.equal(foundAdmin.methodA, adminA);
          assert.equal(foundAdmin.methodB, adminB);
          assert.equal(foundNormal.methodA, normalA);
          assert.equal(foundNormal.methodB, normalB);
        });
    });
  });
});
