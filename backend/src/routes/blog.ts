import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { createPostInput, updatePostInput } from "archit-medium-blog";
import { Hono } from "hono";
import { verify } from "hono/jwt";

export const bookRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    },
    Variables: {
        userId : string
    }
}>();

bookRouter.use('/*', async (c, next) => {
	const jwt = c.req.header('Authorization');
    if (!jwt) {
        c.status(401);
        return c.json({ error: "unauthorized" });
    }
    const token = jwt.split(' ')[1];
    console.log("jwt",token);
    try {
        const user = await verify(token, c.env.JWT_SECRET);
        if (!user || !user.id) {
            c.status(401);
            return c.json({ error: "unauthorized" });
        }
        c.set('userId', user.id as string);
    } catch (e) {
        c.status(401);
        return c.json({ error: "unauthorized" });
    }
    await next();
})

bookRouter.post('/', async (c) => {
    const body = await c.req.json();
    const {success} = createPostInput.safeParse(body);

    if(!success){
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }
	const userId = c.get('userId');
    // console.log("userId",userId)
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

	const post = await prisma.post.create({
		data: {
			title: body.title,
			content: body.content,
			authorId: userId
		}
	});
	return c.json({
		id: post.id
	});
})

bookRouter.put('/', async (c) => {
     const body = await c.req.json();
    // const userId = c.get('userId');
    const {success} = updatePostInput.safeParse(body);

    if(!success){
        c.status(411);
        return c.json({
            message: "Inputs not correct"
        })
    }
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const post = await prisma.post.update({
        where: {
            id: body.id,
        },
        data: {
            title: body.title,
            content: body.content
        }
    });

    return c.json({
        id: post.id
    });
});

//Todo: pagination
bookRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const posts = await prisma.post.findMany();
   
    return c.json({
        posts
    })
})

bookRouter.get('/:id', async (c) => {
    const id = c.req.param('id');
	const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

    try {
        const post = await prisma.post.findFirst({
            where: {
                id
            }
        })

        return c.json({
            post
        });
    } catch(e){
        c.status(411);
        return c.json({
            message: "Error while fetching blog post"
        })
    }	
})



