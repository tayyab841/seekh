import { response } from 'express';
import request from 'supertest'
import app from '../app'

let createdId: string;

// to get a valid token
const ValidToken = async () => {

    let tokenRes = await request(app)
        .post('/login')
        .send({
            email: "user@test.com",
            password: "NEWpassword@0000"
        })
        .set('Accept', 'application/json');

    if (tokenRes.statusCode != 200) {
        tokenRes = await request(app)
            .post('/signup')
            .send({
                name: "new test user",
                email: "user@test.com",
                password: "NEWpassword@0000"
            })
            .set('Accept', 'application/json');
    }

    const { header } = tokenRes;
    return ([...header["set-cookie"]])
}

describe('Course Creation', () => {
    test('Request without token', async () => {
        const res = await request(app)
            .post('/course/create')
            .send({
                name: "Advanced Databases",
            })
            .set('Accept', 'application/json');

        expect(res.body).toEqual('A token is required for authentication');
    });

    test('Request with invalid token', async () => {
        const res = await request(app)
            .post('/course/create')
            .send({
                name: "Advanced Databases",
            })
            .set('Accept', 'application/json')
            .set('Cookie', ['jwt_token=randomString; Max-Age=86400; Path=/; Expires=Sat, 27 Aug 2030 05:26:11 GMT; HttpOnly']);

        expect(res.body).toEqual('Invalid Token');
    });

    test('empty name', async () => {
        const res = await request(app)
            .post('/course/create')
            .send({
                name: "",
            })
            .set('Accept', 'application/json')
            .set('Cookie', await ValidToken());

        expect(res.body).toEqual('Course Name Cannot be Empty!');
    });

    test('valid name and token', async () => {
        const res = await request(app)
            .post('/course/create')
            .send({
                name: "Advanced Databases",
            })
            .set('Accept', 'application/json')
            .set('Cookie', await ValidToken());
        createdId = res.body.courseId;
        expect(res.body).toHaveProperty('courseName');
    });

});

describe('Listing courses you are teaching', () => {
    test('Request without token', async () => {
        const res = await request(app).get('/courses');
        expect(res.body).toEqual('A token is required for authentication');
    });

    test('Request with invalid token', async () => {
        const res = await request(app)
            .get('/courses')
            .set('Cookie', ['jwt_token=randomString; Max-Age=86400; Path=/; Expires=Sat, 27 Aug 2030 05:26:11 GMT; HttpOnly']);

        expect(res.body).toEqual('Invalid Token');
    });

    test('with valid token', async () => {
        const res = await request(app).get('/courses')
            .set('Cookie', await ValidToken());

        expect(res.body).toHaveProperty('courses');
    })
})

describe('get course data', () => {
    test('course with random id', async () => {
        const res = await request(app)
            .get('/course/sdfsdf')
            .set('Cookie', await ValidToken());

        expect(res.body).toEqual('Course not Found!');
    });

    test('course info by other user', async () => {
        // create an other user and et the token
        const signupRes = await request(app)
            .post('/signup')
            .send({
                name: "other user",
                email: "otheruser@test.com",
                password: "NEWpassword@0000"
            })
            .set('Accept', 'application/json');

        const { header } = signupRes;
        const cookie = [...header["set-cookie"]];

        console.log(createdId);
        const res = await request(app)
            .get(`/course/${createdId}`)
            .set('Cookie', cookie);
        expect(res.body).toEqual('Unauthorized');
    });
});

describe('Deleting a course', () => {
    test('Course Id check', async () => {
        const res = await request(app).delete(`/course/asdsadads`)
            .set('Cookie', await ValidToken());;
        expect(res.body).toEqual("Unauthorized!");
    })

    test('Unauthorized delete', async () => {
        // create an other user and et the token
        const loginRes = await request(app)
            .post('/login')
            .send({
                email: "otheruser@test.com",
                password: "NEWpassword@0000"
            })
            .set('Accept', 'application/json');

        const { header } = loginRes;
        const cookie = [...header["set-cookie"]];

        const res = await request(app)
            .delete(`/course/${createdId}`)
            .set('Cookie', cookie);

        expect(res.body).toEqual('Unauthorized!');
    })

    test('course deleted by creator', async () => {
        const res = await request(app)
            .delete(`/course/${createdId}`)
            .set('Cookie', await ValidToken());

        expect(res.body).toEqual('Course Deleted!');
    });
});