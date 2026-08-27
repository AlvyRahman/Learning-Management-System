/**
 * question router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::question.question', {
  config: {
    create: {
      policies: ['global::is-content-owner'],
    },
    update: {
      policies: ['global::is-content-owner'],
    },
    delete: {
      policies: ['global::is-content-owner'],
    },
  },
});
