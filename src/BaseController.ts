export class BaseController {
  public Ok(data: any) {
    return new Response(JSON.stringify(data), {
      status: 200,
    });
  }

  public Error(error: any) {
    return new Response(JSON.stringify({
      success: false,
      error,
    }), {
      status: 500,
    });
  }

  public NotFound() {
    return new Response(JSON.stringify({
      success: false,
      error: "Not Found",
    }), {
      status: 404,
    });
  }
}