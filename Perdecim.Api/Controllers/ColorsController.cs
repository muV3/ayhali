using Perdecim.Api.Entities;
using Perdecim.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Perdecim.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ColorsController(LookupService lookupService) : LookupController<Color>(lookupService);

