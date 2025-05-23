import type { Where } from 'payload'

import configPromise from '@payload-config'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { RenderPage } from '../../../../components/RenderPage'
type Locale = 'all' | 'en' | 'fr' | undefined
export default async function Page({
  params: paramsPromise,
}: {
  params: Promise<{ slug?: string[]; tenant: string; locale: string }>
}) {
  const params = await paramsPromise
  let slug = undefined
  let locale: Locale = undefined

  if (params?.slug) {
    slug = params.slug
  }
  if (params?.locale) {
    locale = params.locale as Locale
  }

  const payload = await getPayload({ config: configPromise })

  try {
    const tenants = await payload.find({
      collection: 'tenants',
      where: {
        domain: {
          equals: params.tenant,
        },
      },
    })
  } catch (e) {
    console.log('Error querying tenants:', e)
    return notFound()
  }

  if (!slug) {
    return notFound()
  }

  const slugConstraint: Where = {
    slug: {
      equals: slug.join('/'),
    },
  }

  const pageQuery = await payload.find({
    collection: 'pages',
    where: {
      and: [
        {
          'tenant.domain': {
            equals: params.tenant,
          },
        },
        slugConstraint,
      ],
    },
    locale: locale,
  })

  const pageData = pageQuery.docs?.[0]

  if (!pageData) {
    return notFound()
  }

  return <RenderPage data={pageData} />
}

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })

  const tenants = await payload.find({
    collection: 'tenants',
  })

  const pages = await payload.find({
    collection: 'pages',
  })

  const locales: Locale[] = ['en', 'fr']

  const params = []

  for (const tenant of tenants.docs) {
    for (const page of pages.docs) {
      if (typeof page.tenant === 'object' && page.tenant?.domain === tenant.domain && page.slug) {
        for (const locale of locales) {
          params.push({
            tenant: tenant.domain,
            locale,
            slug: page.slug.split('/'),
          })
        }
      }
    }
  }

  return params
}
